import { 
    generateDailyAttendancePDF, 
    generateWeeklyAttendancePDF, 
    generateMonthlyAttendancePDF 
} from "../utils/pdfUtils.js";
import { 
    generateFilteredEmployeePDF, 
    generateWeeklyEmployeePDF, 
    generateMonthlyEmployeePDF,
    generateFilteredAttendancePDF 
} from "../utils/employeePdfUtils.js";
import fs from 'fs';

// Generate daily attendance PDF
export const generatePdfDaily = async (req, res) => {
    try {
        const { fileName, filePath } = await generateDailyAttendancePDF(req.body.data);
        res.download(filePath, fileName, () => {
            fs.unlinkSync(filePath); // Delete file after sending
        });
    } catch (error) {
        console.error("Error generating PDF:", error);
        res.status(500).send("Error generating PDF");
    }
};

// Generate weekly attendance PDF
export const generatePdfWeekly = async (req, res) => {
    try {
        const { fileName, filePath } = await generateWeeklyAttendancePDF(req.body.data);
        res.download(filePath, fileName, () => {
            fs.unlinkSync(filePath); // Delete file after sending
        });
    } catch (error) {
        console.error("Error generating PDF:", error);
        res.status(500).send("Error generating PDF");
    }
};

// Generate monthly attendance PDF
export const generatePdfMonthly = async (req, res) => {
    try {
        const { fileName, filePath } = await generateMonthlyAttendancePDF(req.body.data);
        res.download(filePath, fileName, () => {
            fs.unlinkSync(filePath); // Delete file after sending
        });
    } catch (error) {
        console.error("Error generating PDF:", error);
        res.status(500).send("Error generating PDF");
    }
};

// Generate filtered attendance PDF
export const generateFiltered = async (req, res) => {
    try {
        const { fileName, filePath } = await generateFilteredAttendancePDF(req.body.data);
        res.download(filePath, fileName, () => {
            fs.unlinkSync(filePath); // Delete file after sending
        });
    } catch (error) {
        console.error("Error generating PDF:", error);
        res.status(500).send("Error generating PDF");
    }
};

// Generate filtered employee attendance PDF
export const generatePdfFilteredOfEmployee = async (req, res) => {
    try {
        const { fileName, filePath } = await generateFilteredEmployeePDF(req.body.data);
        res.download(filePath, fileName, () => {
            fs.unlinkSync(filePath); // Delete file after sending
        });
    } catch (error) {
        console.error("Error generating PDF:", error);
        res.status(500).send("Error generating PDF");
    }
};

// Generate weekly employee attendance PDF
export const generatePdfWeeklyOfEmployee = async (req, res) => {
    try {
        const { fileName, filePath } = await generateWeeklyEmployeePDF(req.body.data);
        res.download(filePath, fileName, () => {
            fs.unlinkSync(filePath); // Delete file after sending
        });
    } catch (error) {
        console.error("Error generating PDF:", error);
        res.status(500).send("Error generating PDF");
    }
};

// Generate monthly employee attendance PDF
export const generatePdfMonthlyOfEmployee = async (req, res) => {
    try {
        const { fileName, filePath } = await generateMonthlyEmployeePDF(req.body.data);
        res.download(filePath, fileName, () => {
            fs.unlinkSync(filePath); // Delete file after sending
        });
    } catch (error) {
        console.error("Error generating PDF:", error);
        res.status(500).send("Error generating PDF");
    }
};
