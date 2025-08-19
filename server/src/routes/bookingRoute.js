import express from 'express';
import { createBooking, getBookingsByUserId, getMachingBookingsByField, getMatchingBookings, matchBooking, confirmBooking, getUserBookings, cancelBooking, getBookingById, updateBooking, getAvailableBookings, getFieldByBookingId } from '../controllers/bookingController.js';

const router = express.Router();

router.post('/bookings', createBooking);
router.get('/bookings/:bookingId', getBookingById);
router.get('/bookings/:bookingId/field', getFieldByBookingId);
router.get('/bookings/user/:userId', getBookingsByUserId);
router.get('/bookings/available', getAvailableBookings);
router.get('/bookings/matchingbyfieldid', getMachingBookingsByField);
router.get('/bookings/matching', getMatchingBookings);
router.post('/bookings/match', matchBooking);
router.post('/bookings/confirm/:bookingId', confirmBooking);
router.get('/bookings/user/:userId', getUserBookings);
router.delete('/bookings/:bookingId', cancelBooking);
router.put('/bookings/:bookingId', updateBooking);

export default router;