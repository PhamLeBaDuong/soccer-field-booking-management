import express from 'express';
import {getAllComplexes, getAllFields, getComplexById, getFieldsByComplexId, addComplex, addField, updateComplex, updateField, deleteComplex, deleteField} from '../controllers/adminController.js';

const router = express.Router();
router.get('/complexes', getAllComplexes);
router.get('/fields', getAllFields);
router.get('/complexes/:id', getComplexById);
router.get('/complexes/:complexId/fields', getFieldsByComplexId);
router.post('/complexes', addComplex);
router.post('/fields', addField);
router.put('/complexes/:id', updateComplex);
router.put('/fields/:id', updateField);
router.delete('/complexes/:id', deleteComplex);
router.delete('/fields/:id', deleteField);

export default router;