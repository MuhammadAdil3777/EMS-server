import pdf from 'html-pdf';
import fs from 'fs';

// Generate daily attendance PDF
export const generateDailyAttendancePDF = (data) => {
    const htmlContent = `
    <html>
    <head>
        <style>
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid black; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
        </style>
    </head>
    <body>
        <h1>Daily Attendance Report</h1>
        <table>
            <thead>
                <tr>
                    <th>Employee Name</th>
                    <th>Check-in</th>
                    <th>Check-out</th>
                    <th>Work Mode</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${data.map(item => `
                    <tr>
                        <td>${item.full_name}</td>
                        <td>${item.check_in}</td>
                        <td>${item.check_out}</td>
                        <td>${item.work_mode}</td>
                        <td>${item.status}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </body>
    </html>
    `;

    return new Promise((resolve, reject) => {
        const fileName = `attendance_${new Date().toISOString().split('T')[0]}.pdf`;
        pdf.create(htmlContent).toFile(fileName, (err, result) => {
            if (err) {
                reject(err);
            } else {
                resolve({ fileName, filePath: result.filename });
            }
        });
    });
};

// Generate weekly attendance PDF
export const generateWeeklyAttendancePDF = (data) => {
    const htmlContent = `
    <html>
    <head>
        <style>
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid black; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
        </style>
    </head>
    <body>
        <h1>Weekly Attendance Report</h1>
        <table>
            <thead>
                <tr>
                    <th>Employee Name</th>
                    <th>Attendance</th>
                    <th>Absentees</th>
                    <th>Working Hours</th>
                    <th>Working Hours %</th>
                </tr>
            </thead>
            <tbody>
                ${data.map(item => `
                    <tr>
                        <td>${item.user.full_name}</td>
                        <td>${item.presentDays}</td>
                        <td>${item.absentDays}</td>
                        <td>${item.totalHoursWorked.toFixed(2)}</td>
                        <td>${item.workingHoursPercentage.toFixed(2)}%</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </body>
    </html>
    `;

    return new Promise((resolve, reject) => {
        const fileName = `attendance_${new Date().toISOString().split('T')[0]}.pdf`;
        pdf.create(htmlContent).toFile(fileName, (err, result) => {
            if (err) {
                reject(err);
            } else {
                resolve({ fileName, filePath: result.filename });
            }
        });
    });
};

// Generate monthly attendance PDF
export const generateMonthlyAttendancePDF = (data) => {
    const htmlContent = `
    <html>
    <head>
        <style>
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid black; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
        </style>
    </head>
    <body>
        <h1>Monthly Attendance Report</h1>
        <table>
            <thead>
                <tr>
                    <th>Employee Name</th>
                    <th>Attendance</th>
                    <th>Absentees</th>
                    <th>Working Hours</th>
                    <th>Working Hours %</th>
                </tr>
            </thead>
            <tbody>
                ${data.map(item => `
                    <tr>
                        <td>${item.user.full_name}</td>
                        <td>${item.presentDays}</td>
                        <td>${item.absentDays}</td>
                        <td>${item.totalHoursWorked.toFixed(2)}</td>
                        <td>${item.workingHoursPercentage.toFixed(2)}%</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </body>
    </html>
    `;

    return new Promise((resolve, reject) => {
        const fileName = `attendance_${new Date().toISOString().split('T')[0]}.pdf`;
        pdf.create(htmlContent).toFile(fileName, (err, result) => {
            if (err) {
                reject(err);
            } else {
                resolve({ fileName, filePath: result.filename });
            }
        });
    });
};
