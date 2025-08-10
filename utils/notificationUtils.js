import admin from "../config/firebase.js";
import { supabase } from "../config/database.js";

// Send FCM notification to all users
export const sendBulkNotification = async (title, body, url) => {
    // Fetch all FCM tokens with user information
    const { data: tokenData, error } = await supabase
        .from("fcm_tokens")
        .select("token, user_id, users(full_name)")
        .order("last_used_at", { ascending: false });

    if (error) throw new Error(error.message);

    if (!tokenData || tokenData.length === 0) {
        throw new Error("No valid FCM tokens found.");
    }

    // Create a base message template
    const baseMessage = {
        notification: {
            icon: "/favicon.ico"
        },
        data: {
            url: url || "/",
            timestamp: String(Date.now())
        },
        android: {
            priority: "high",
            notification: {
                sound: "default",
                priority: "high",
                channelId: "general-notifications"
            }
        },
        apns: {
            payload: {
                aps: {
                    sound: "default",
                    badge: 1,
                    contentAvailable: true
                }
            }
        },
        webpush: {
            notification: {
                icon: "/favicon.ico",
                badge: "/favicon.ico",
                vibrate: [200, 100, 200],
                requireInteraction: true
            },
            fcmOptions: {
                link: url || "/"
            }
        }
    };

    // Send notifications to all tokens
    const responses = await Promise.all(
        tokenData.map(async (item) => {
            try {
                const userName = item.users?.full_name || "User";

                const message = {
                    ...baseMessage,
                    token: item.token,
                    notification: {
                        ...baseMessage.notification,
                        title: `${userName}: ${title}`,
                        body: body
                    }
                };

                const response = await admin.messaging().send(message);
                return { token: item.token, userId: item.user_id, success: true, response };
            } catch (sendError) {
                // If the token is invalid, remove it from the database
                if (sendError.code === 'messaging/invalid-registration-token' ||
                    sendError.code === 'messaging/registration-token-not-registered') {
                    try {
                        await supabase
                            .from("fcm_tokens")
                            .delete()
                            .eq("token", item.token);
                        console.log(`Removed invalid token: ${item.token}`);
                    } catch (deleteError) {
                        console.error("Error removing invalid token:", deleteError);
                    }
                }
                return { token: item.token, userId: item.user_id, success: false, error: sendError.message };
            }
        })
    );

    // Count successful notifications
    const successCount = responses.filter(r => r.success).length;

    console.log(`Sent ${successCount} notifications successfully out of ${tokenData.length} tokens`);
    return {
        success: successCount > 0,
        totalTokens: tokenData.length,
        successCount,
        responses
    };
};

// Send FCM notification to a specific user
export const sendSingleNotification = async (title, body, fcmtoken, userId, taskId, projectId, url) => {
    // Create the base message payload
    const baseMessage = {
        notification: {
            title,
            body,
        },
        data: {
            url: url || "/",
            taskId: taskId ? String(taskId) : "",
            projectId: projectId ? String(projectId) : "",
            timestamp: String(Date.now())
        },
        android: {
            priority: "high",
            notification: {
                sound: "default",
                priority: "high",
                channelId: "task-notifications"
            }
        },
        apns: {
            payload: {
                aps: {
                    sound: "default",
                    badge: 1,
                    contentAvailable: true
                }
            }
        },
        webpush: {
            notification: {
                icon: "/favicon.ico",
                badge: "/favicon.ico",
                vibrate: [200, 100, 200],
                requireInteraction: true
            },
            fcmOptions: {
                link: url || "/"
            }
        }
    };

    let tokens = [];

    // If a specific token is provided, use it
    if (fcmtoken) {
        tokens.push(fcmtoken);
    }

    // If a user ID is provided, get all tokens for that user
    if (userId) {
        try {
            // Normalize the user_id to lowercase for consistency
            const normalizedUserId = userId.toLowerCase();
            console.log(`Using normalized user ID: ${normalizedUserId}`);

            // Try to get tokens from the fcm_tokens table
            let { data: userTokens, error } = await supabase
                .from("fcm_tokens")
                .select("token, device_info")
                .eq("user_id", normalizedUserId);

            console.log(`Query for user_id=${userId} returned:`, { data: userTokens, error });

            // If no results, try with case-insensitive comparison
            if (!error && (!userTokens || userTokens.length === 0)) {
                console.log("No tokens found with exact match, trying case-insensitive search");

                const { data: allUserTokens, error: allError } = await supabase
                    .from("fcm_tokens")
                    .select("user_id, token, device_info");

                if (!allError && allUserTokens && allUserTokens.length > 0) {
                    const matchingTokens = allUserTokens.filter(t =>
                        t.user_id && t.user_id.toLowerCase() === normalizedUserId
                    );

                    if (matchingTokens.length > 0) {
                        console.log(`Found ${matchingTokens.length} tokens with case-insensitive match`);
                        userTokens = matchingTokens;
                    }
                }
            }

            if (error) {
                // If there's an error, try the users table as fallback
                console.log("Error fetching from fcm_tokens table, trying users table as fallback:", error.message);

                const { data: userData, error: userError } = await supabase
                    .from("users")
                    .select("fcm_token")
                    .eq("id", userId)
                    .single();

                if (!userError && userData && userData.fcm_token) {
                    if (!tokens.includes(userData.fcm_token)) {
                        if (userData.fcm_token && userData.fcm_token.length > 20) {
                            tokens.push(userData.fcm_token);
                            console.log(`Using FCM token from users table as fallback`);
                        }
                    }
                }
            } else if (userTokens && userTokens.length > 0) {
                console.log(`Found ${userTokens.length} tokens for user ${userId} in fcm_tokens table`);
                userTokens.forEach(item => {
                    if (!tokens.includes(item.token)) {
                        tokens.push(item.token);
                        const deviceInfo = item.device_info ?
                            `(${JSON.parse(item.device_info).platform || 'unknown device'})` :
                            '(no device info)';
                        console.log(`Added token for user ${userId} ${deviceInfo}`);
                    }
                });
            } else {
                console.log(`No tokens found for user ${userId} in fcm_tokens table`);

                // Try the users table as fallback
                const { data: userData, error: userError } = await supabase
                    .from("users")
                    .select("fcm_token")
                    .eq("id", userId)
                    .single();

                if (!userError && userData && userData.fcm_token) {
                    if (!tokens.includes(userData.fcm_token)) {
                        if (userData.fcm_token && userData.fcm_token.length > 20) {
                            tokens.push(userData.fcm_token);
                            console.log(`Using FCM token from users table as fallback`);
                        }
                    }
                }
            }
        } catch (dbError) {
            console.error("Database error fetching tokens:", dbError);
        }
    }

    // If we have no tokens, return an error
    if (tokens.length === 0) {
        throw new Error("No valid FCM tokens found for this user.");
    }

    // Send notifications to all tokens
    const responses = await Promise.all(
        tokens.map(async (token) => {
            try {
                const message = { ...baseMessage, token };
                const response = await admin.messaging().send(message);
                return { token, success: true, response };
            } catch (sendError) {
                // If the token is invalid, remove it from both tables
                if (sendError.code === 'messaging/invalid-registration-token' ||
                    sendError.code === 'messaging/registration-token-not-registered') {
                    try {
                        // Remove from fcm_tokens table
                        await supabase
                            .from("fcm_tokens")
                            .delete()
                            .eq("token", token);

                        // Also check if this token is in the users table and clear it
                        const { data: usersWithToken } = await supabase
                            .from("users")
                            .select("id")
                            .eq("fcm_token", token);

                        if (usersWithToken && usersWithToken.length > 0) {
                            for (const user of usersWithToken) {
                                await supabase
                                    .from("users")
                                    .update({ fcm_token: null })
                                    .eq("id", user.id);
                            }
                        }
                    } catch (deleteError) {
                        console.error("Error removing invalid token:", deleteError);
                    }
                }
                return { token, success: false, error: sendError.message };
            }
        })
    );

    // Count successful notifications
    const successCount = responses.filter(r => r.success).length;

    console.log(`Sent ${successCount} notifications successfully out of ${tokens.length} tokens`);
    return {
        success: successCount > 0,
        totalTokens: tokens.length,
        successCount,
        responses
    };
};
