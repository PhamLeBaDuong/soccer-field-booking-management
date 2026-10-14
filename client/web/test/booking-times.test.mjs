import test from "node:test";
import assert from "node:assert/strict";
import { bookingTimeZone, combineDateAndTime, durationHours, formatDateRange, nextCalendarDate } from "../src/lib/utils/format.ts";
import { validateReservationTime } from "../../../server/src/services/reservationService.js";
const field = { startTime: "2000-01-01T06:00Z", endTime: "2000-01-01T22:00Z", pricePerHour: 100, metadata: { timeZone: "UTC" } };
test("field schedule is independent of the viewer timezone", () => {
 const original=process.env.TZ;
 try {
  for(const viewer of ["UTC","America/Indiana/Indianapolis","Asia/Ho_Chi_Minh","Pacific/Auckland"]){
   process.env.TZ=viewer; assert.equal(bookingTimeZone(),"UTC");
   for(const zone of ["UTC","America/Indiana/Indianapolis","Asia/Ho_Chi_Minh"]){
    const configured={...field,metadata:{timeZone:zone}};
    for(const [start,end,hours] of [["15:30","17:00",1.5],["15:30","19:00",3.5],["06:00","22:00",16]]){
     const s=combineDateAndTime("2099-10-11",start,zone),e=combineDateAndTime("2099-10-11",end,zone);
     assert.equal(validateReservationTime(configured,s,e).totalPrice,hours*100);
     assert.equal(durationHours(s,e),hours);assert.ok(formatDateRange(s,e,zone).endsWith(`${start}-${end}`));
    }
    assert.throws(()=>validateReservationTime(configured,combineDateAndTime("2099-10-11","21:30",zone),combineDateAndTime("2099-10-11","22:30",zone)),/outside field operating hours/);
    const overnight={...configured,startTime:"2000-01-01T18:00Z",endTime:"2000-01-01T02:00Z"};
    assert.equal(validateReservationTime(overnight,combineDateAndTime("2099-10-11","23:30",zone),combineDateAndTime(nextCalendarDate("2099-10-11"),"01:00",zone)).totalPrice,150);
   }
  }
  assert.equal(nextCalendarDate("2099-12-31"),"2100-01-01");assert.equal(nextCalendarDate("2028-02-28"),"2028-02-29");
 }finally{if(original===undefined)delete process.env.TZ;else process.env.TZ=original;}
});
test("afternoon field times keep their offset and remain future instants",()=>{
 const zone="America/Indiana/Indianapolis",s=combineDateAndTime("2026-10-13","18:30",zone),e=combineDateAndTime("2026-10-13","20:30",zone);
 assert.equal(s,"2026-10-13T22:30:00.000Z");assert.equal(e,"2026-10-14T00:30:00.000Z");
 assert.equal(validateReservationTime({...field,metadata:{timeZone:zone}},s,e,new Date("2026-10-13T21:14Z")).totalPrice,200);
});
test("invalid field timezone fails validation",()=>{
 assert.throws(()=>validateReservationTime({...field,metadata:{timeZone:"invalid"}},"2099-10-13T15:30Z","2099-10-13T17:00Z"),/Invalid reservation timeZone/);
});
test("daylight saving conversion preserves real elapsed duration",()=>{
 const zone="America/Indiana/Indianapolis";assert.throws(()=>combineDateAndTime("2099-03-08","02:30",zone),/clocks change/);
 const allDay={...field,metadata:{timeZone:zone},startTime:"2000-01-01T00:00Z",endTime:"2000-01-01T00:00Z"};
 const s=combineDateAndTime("2027-03-14","01:30",zone),e=combineDateAndTime("2027-03-14","03:30",zone);
 assert.equal(durationHours(s,e),1);assert.equal(validateReservationTime(allDay,s,e,new Date("2026-01-01Z")).totalPrice,100);
});
