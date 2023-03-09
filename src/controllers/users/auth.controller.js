import moment from "moment";
import mtz from "moment-timezone";
import uniqid from "uniqid";
import { isEmpty } from "lodash";


const  userId = process.env.userId
const eventId = process.env.eventId
const areaCode = process.env.areacode
const eventTg = process.env.eventTag

let generateUUID = async () => {
  return (
    areaCode + moment().format("YY") + uniqid.time().toUpperCase() + moment().format("MMDD")
  );
};

const emptyString = (value) =>
  value === null || value === "" || value === undefined;

export default class Controller {

  async getEvents(req, res, next) {
    try {
      let surveys = await req.dba.query(`
				SELECT * 
				FROM regsurvey
        WHERE
          eventId = ?
			`,[eventId]);

      let events = await req.dba.query(
        `
				SELECT * 
				FROM events 
				WHERE 
          eventId = ?
        `,
        [eventId]
      );
      
      let obj = {
        event:events,
        surveys: surveys
      }
      return res.status(200).json(obj);
    } catch (err) {
      console.log(err)
      next(err);
    }
  }

  async searchAttendee(req,res,next){
    let {
      qrCode,
      firstName,
      lastName
    } = req.body

    try{
      let result = await req.dba.query(`
        SELECT 
          qrCode,
          title,
          firstName,
          middleName,
          lastName,
          email,
          mobileNumber,
          companyName,
          designation,
          prcExpiry,
          prcNumber
        FROM attendees
        WHERE
          eventId = "${eventId}"
          ${!emptyString(qrCode) ? `AND qrCode = "${qrCode}"` : ''}
          ${!emptyString(firstName) ? `AND firstName LIKE "%${firstName}%"` : ''}
          ${!emptyString(lastName) ? `AND lastName LIKE "${lastName}%"` : ''}

      `)

      res.status(200).json(result)
    }catch(err){
      next(err)
    }
  }
  async createAttendee(req, res, next) {
    let date = moment().tz("Asia/Manila").format("YYYY-MM-DD");
    let dateTime = moment().tz("Asia/Manila").format("YYYY-MM-DD HH:mm:ss");


    const { 
      title,
      firstName,
      middleName,
      lastName,
      email,
      mobileNumber,
      companyName,
      designation,
      prcNumber,
      prcExpiry,
      survey 
    } = req.body;

    let fName = firstName.replace(/^\s+|\s+$/g, "").replace(/\s+/g, " ").replace(/[^a-zA-Z ]/g, "");
    let lName = lastName.replace(/^\s+|\s+$/g, "").replace(/\s+/g, " ").replace(/[^a-zA-Z ]/g, "");
    
    let connection
    try {
      let eventList = await req.dba.query(`
        SELECT * 
        FROM events
        WHERE 
          eventId = ? 
      `,[eventId])

      connection = await req.dba.beginTransaction();

      let [transactionId] = await connection.query(`SELECT uuid() as uuid`);
      transactionId = transactionId[0].uuid;
      let status = "S";
      let tnNumber = areaCode + uniqid.time().toUpperCase();
      await connection.query(
        `
				INSERT INTO transactions
				SET ?
			`,
        {
          transactionId: transactionId,
          transactionNumber: tnNumber,
          status: status,
          userId: userId,
          paymentChannel: "SYSTEM",
          createdAt: dateTime,
          updatedAt: dateTime,
        }
      );
      let [transactionDetailsId] = await connection.query(`SELECT uuid() as uuid`);
      transactionDetailsId = transactionDetailsId[0].uuid;
      await connection.query(
        `
        INSERT INTO transactiondetails 
        SET ?
      `,
        {
          transactionDetailsId: transactionDetailsId,
          transactionId: transactionId,
          itemCode: eventId,
          itemName: eventTg,
          amount: '0.00',
          quantity: 1,
          createdAt: dateTime,
          updatedAt: dateTime,
        }
      );

      let qr = await generateUUID();
      let [attendeeId] = await connection.query(`SELECT uuid() as uuid`);
      attendeeId = attendeeId[0].uuid;
      await connection.query(
        `
        INSERT INTO attendees
        SET ?
      `,
        {
          attendeeId: attendeeId,
          userId: userId,
          transactionId: transactionId,
          transactionDetailsId: transactionDetailsId,
          eventId: eventId,
          qrCode: qr,
          attendDate: eventList[0].dateSeries,
          title:title,
          firstName: fName,
          middleName: middleName || null,
          lastName: lName,
          email: email,
          mobileNumber: mobileNumber,
          companyName: companyName || null,
          designation: designation || null,
          prcNumber: prcNumber || null,
          prcExpiry: prcExpiry || null,
          isSent: 1,
          registeredAt: 2,
          createdAt: dateTime,
          updatedAt: dateTime,
        }
      );
      
      if (!isEmpty(survey)) {
        for (let val of survey) {
          let { category, answer } = val;
          let [surveyId] = await connection.query(`SELECT uuid() as uuid`);
          surveyId = surveyId[0].uuid;
          await connection.query(
            `
            INSERT INTO regsurveyresponse 
            SET ?
          `,
            {
              responseId: surveyId,
              eventId: eventId,
              userId: userId,
              qrCode:qr,
              category: category,
              answer: answer.replace("'", "\\'"),
              createdAt: dateTime,
              updatedAt: dateTime,
            }
          );
        }
      }

      await req.dba.commit(connection);

      return res.status(200).json({
        qrCode:qr,
        title:title || null,
        firstName: firstName,
        middleName:middleName || null,
        lastName: lastName,
        companyName: companyName || null,
        message: `Success.`,
      });
    } catch (err) {
      console.log(err)
      await req.dba.rollback(connection);
      next(err);
    }
  }
  async updateAttendee(req,res,next){
    let date = moment().tz("Asia/Manila").format("YYYY-MM-DD");
    let dateTime = moment().tz("Asia/Manila").format("YYYY-MM-DD HH:mm:ss");
    let {qrCode} = req.params

    const { 
      title,
      firstName,
      middleName,
      lastName,
      email,
      mobileNumber,
      companyName,
      designation,
      prcNumber,
      prcExpiry
    } = req.body;
    let fName = firstName.replace(/^\s+|\s+$/g, "").replace(/\s+/g, " ").replace(/[^a-zA-Z ]/g, "");
    let lName = lastName.replace(/^\s+|\s+$/g, "").replace(/\s+/g, " ").replace(/[^a-zA-Z ]/g, "");
    try{

      let check = await req.dba.query(`
        SELECT
          qrCode
        FROM attendees
        WHERE
          qrCode = ? AND
          eventId = ? 
      `,[qrCode,eventId])
      
      if(check.length === 0){
        return res.status(401).json({error:401,message:`No record found.`})
      }

      let result = await req.dba.query(
        `
        UPDATE attendees
        SET ?
        WHERE
        qrCode = ?
      `,
        [{
          title:title || null,
          firstName: fName,
          middleName: middleName || null,
          lastName: lName,
          email: email,
          mobileNumber: mobileNumber,
          companyName: companyName || null,
          designation: designation || null,
          prcNumber: prcNumber || null,
          prcExpiry: prcExpiry || null,
          isSent: 1,
          updatedAt: dateTime,
          fromSync:0
        },qrCode]
      );

      if(result.affectedRows > 0){
        return res.status(200).json({
          qrCode:qrCode,
          title:title || null,
          firstName: firstName,
          middleName:middleName || null,
          lastName: lastName,
          companyName: companyName || null,
          message: `Success.`,
        })
      }else{
        return res.status(403).json({error:403,message:`Failed to update record.`})
      }

    }catch(err){
      console.log(err)
      next(err)
    }
  }
  async addPrintlogs(req,res,next){
    let date = moment().tz("Asia/Manila").format("YYYY-MM-DD HH:mm:ss");
    
    let val = req.body 
    val.printLogsId = (await req.dba.query(`SELECT uuid() as uuid`))[0].uuid
    val.site = (areaCode == 21) ? "WTC" : "SMX" 
    val.eventId = eventId
    val.dateCreated = date 
    try{
      let insrt = await req.dba.query(`
        INSERT INTO printlogs
        SET ?
      `,val)

      if(insrt.insertId > 0){
        return res.status(200).json({message:`Success.`})
      }else{
        return res.status(401).json({message:`Failed.`})
      }
    }catch(err){
      next(err)
    }
  }
}
