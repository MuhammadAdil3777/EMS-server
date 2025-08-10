import express from "express";
import { 
    generatePdfDaily, 
    generatePdfWeekly, 
    generatePdfMonthly,
    generateFiltered,
    generatePdfFilteredOfEmployee,
    generatePdfWeeklyOfEmployee,
    generatePdfMonthlyOfEmployee 
} from "../controllers/pdfController.js";

const router = express.Router();

// Generate daily attendance PDF
router.post("/generate-pdfDaily", generatePdfDaily);

// Generate weekly attendance PDF
router.post("/generate-pdfWeekly", generatePdfWeekly);

// Generate monthly attendance PDF
router.post("/generate-pdfMonthly", generatePdfMonthly);

// Generate filtered attendance PDF
router.post("/generate-Filtered", generateFiltered);

// Generate filtered employee attendance PDF
router.post("/generate-pdfFilteredOfEmployee", generatePdfFilteredOfEmployee);

// Generate weekly employee attendance PDF
router.post("/generate-pdfWeeklyOfEmployee", generatePdfWeeklyOfEmployee);

// Generate monthly employee attendance PDF
router.post("/generate-pdfMonthlyOfEmployee", generatePdfMonthlyOfEmployee);

export default router;
