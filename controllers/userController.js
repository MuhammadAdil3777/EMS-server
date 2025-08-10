import { supabaseAdmin } from "../config/database.js";
import { createEmailTransporter, EMAIL_CONFIG } from "../config/email.js";

// Create Admin User
export const createAdmin = async (req, res) => {
    try {
        const { email, password, full_name, organization_id } = req.body;

        // Validate input
        if (!email || !password || !full_name || !organization_id) {
            return res.status(400).json({
                error: "Email, password, full name, and organization ID are required"
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                error: "Password must be at least 6 characters long"
            });
        }

        // Check if user exists in database by email
        const { data: existingUser, error: checkError } = await supabaseAdmin
            .from('users')
            .select('id, email')
            .eq('email', email.trim())
            .maybeSingle();

        // Check if auth user exists
        const { data: authUsers, error: authCheckError } = await supabaseAdmin.auth.admin.listUsers();
        const existingAuthUser = authUsers?.users?.find(user => user.email === email.trim());

        if (existingUser) {
            return res.status(400).json({
                error: "A user with this email already exists in database"
            });
        }

        if (existingAuthUser) {
            return res.status(400).json({
                error: "Auth user already exists with this email. Please use a different email or contact administrator."
            });
        }

        // Create auth user
        console.log(`Creating auth user for email: ${email.trim()}`);
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: email.trim(),
            password: password,
            email_confirm: true,
            user_metadata: {
                full_name: full_name.trim()
            }
        });

        if (authError) {
            console.error("Auth user creation failed:", authError);
            return res.status(400).json({ error: `Auth creation failed: ${authError.message}` });
        }

        if (!authData?.user?.id) {
            console.error("Auth user created but no user ID returned");
            return res.status(400).json({ error: "Auth user creation failed - no user ID" });
        }

        console.log(`Auth user created successfully with ID: ${authData.user.id}`);

        // Verify auth user was created properly
        const { data: verifyUser, error: verifyError } = await supabaseAdmin.auth.admin.getUserById(authData.user.id);
        if (verifyError || !verifyUser) {
            console.error("Auth user verification failed:", verifyError);
            return res.status(400).json({ error: "Auth user creation verification failed" });
        }
        console.log(`Auth user verified: ${verifyUser.user.email}`);

        // Declare userData variable
        let userData;

        // Check if this ID already exists in database (shouldn't happen but let's verify)
        console.log(`Checking if ID ${authData.user.id} exists in database...`);
        const { data: existingRecord, error: existingError } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('id', authData.user.id)
            .maybeSingle();

        console.log('Database check result:', { existingRecord, existingError });

        if (existingRecord) {
            console.log(`Database record found for ID ${authData.user.id}, updating existing record...`);
            const { data: updateData, error: updateError } = await supabaseAdmin
                .from('users')
                .update({
                    email: email.trim(),
                    full_name: full_name.trim(),
                    role: 'admin',
                    organization_id: organization_id
                })
                .eq('id', authData.user.id)
                .select()
                .single();

            if (updateError) {
                console.error("Update failed:", updateError);
                try {
                    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
                    console.log("Rolled back auth user creation");
                } catch (deleteError) {
                    console.error("Failed to rollback auth user:", deleteError);
                }
                return res.status(400).json({ error: "Failed to update existing user record" });
            }

            console.log("User record updated successfully");
            userData = updateData;
        } else {
            console.log(`No existing record found for ID ${authData.user.id}, proceeding with insertion...`);

            // Create user profile with admin role
            console.log(`Creating database record for user ID: ${authData.user.id}`);
            const { data: insertData, error: userError } = await supabaseAdmin
                .from('users')
                .insert([{
                    id: authData.user.id,
                    email: email.trim(),
                    full_name: full_name.trim(),
                    role: 'admin',
                    organization_id: organization_id,
                    created_at: new Date().toISOString()
                }])
                .select()
                .single();

            if (userError) {
                console.error("Database error:", userError);
                try {
                    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
                    console.log("Rolled back auth user creation");
                } catch (deleteError) {
                    console.error("Failed to rollback auth user:", deleteError);
                }
                return res.status(400).json({ error: userError.message });
            }

            userData = insertData;
        }

        // Send welcome email
        if (process.env.VITE_EMAIL_USER && process.env.VITE_EMAIL_PASS) {
            try {
                const transporter = createEmailTransporter();

                const mailOptions = {
                    from: EMAIL_CONFIG.FROM,
                    to: email,
                    subject: "Welcome to TechCreator EMS - Admin Account Created",
                    html: `
                        <h2>Welcome ${full_name}!</h2>
                        <p>Your admin account has been created successfully.</p>
                        <p><strong>Email:</strong> ${email}</p>
                        <p><strong>Temporary Password:</strong> ${password}</p>
                        <p>Please login with these credentials.</p>
                        <p>We recommend changing your password after your first login.</p>
                        <p>Best regards,<br>TechCreator Team</p>
                    `
                };

                await transporter.sendMail(mailOptions);
                console.log("Welcome email sent to new admin");
            } catch (emailError) {
                console.error("Failed to send welcome email:", emailError);
            }
        }

        res.status(201).json({
            success: true,
            message: "Admin user created successfully. User can now login with the provided credentials.",
            user: userData,
            auth_user_id: authData.user.id
        });

    } catch (error) {
        console.error("Error creating admin user:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
