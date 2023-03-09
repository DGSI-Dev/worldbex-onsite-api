import moment from "moment";
import mtz from "moment-timezone";
import uniqid from "uniqid";
import { isEmpty } from "lodash";

import Promise from 'bluebird'


const  userId = process.env.userId
const eventId = process.env.eventId
const areCode = process.env.areacode


const emptyString = (value) =>
  value === null || value === "" || value === undefined;

export default class Controller {
  async syncToLocalServer(req,res,next){
    let{
      attendees,
      transactions,
      transactiondetails
    } = req.body

    delete attendees.id
    delete transactions.id
    delete transactiondetails.id

    let connection = await req.dba.getConnection();
    try{  
      if(isEmpty(attendees) || isEmpty(transactions) || isEmpty(transactiondetails)){
        return res.status(400).json({
          error:400,
          message:`Failed to insert data.`,
          emAttnd:isEmpty(attendees),
          emTrnsctn:isEmpty(transactions),
          emTrnsctionDtls:isEmpty(transactiondetails)
        })
      }

      let check = await req.dba.query(`
        SELECT
          userId,
          qrCode
        FROM
          attendees
        WHERE
          userId = ? AND
          qrCode = ?  
      `,[attendees.userId,attendees.qrCode])

      // if(check.length > 0){
      //   return res.status(401).json({error:401,message:`Guest data already synced.`})
      // }
      await connection.beginTransaction();

      if(check.length > 0){
        await connection.query(
          `
          UPDATE attendees
          SET ?
          WHERE
          userId = ? AND
          qrCode = ? 
        `,[attendees,attendees.userId,attendees.qrCode]);
          
      }else{
        await connection.query(
          `
          INSERT INTO transactions
          SET ?
        `,transactions
        );
        await connection.query(
          `
          INSERT INTO transactiondetails 
          SET ?
        `,transactiondetails
        );
  
        await connection.query(
          `
          INSERT INTO attendees
          SET ?
        `,attendees);  
      }
      

      await connection.commit();
      await connection.release();

      return res.status(200).json({
        message: `Success.`,
      });
    }catch(err){
      console.log(err)
      await connection.rollback();
      await connection.release();
      next(err)
    }
  } 

  async searchDataFromLocalServer(req,res,next){
    let {
      qrCode,
      firstName,
      lastName
    } = req.body
    try{
      let attnds = await req.dba.query(`
        SELECT *
        FROM attendees
        WHERE
          eventId = "${eventId}"
          ${!emptyString(qrCode) ? `AND qrCode = "${qrCode}"` : ''}
          ${!emptyString(firstName) ? `AND firstName LIKE "%${firstName}%"` : ''}
          ${!emptyString(lastName) ? `AND lastName LIKE "${lastName}%"` : ''}

      `)
      let results = await Promise.map(attnds, async ({ transactionId,transactionDetailsId, ...rest }) => {
        let trns = await req.dba.query(`SELECT * FROM transactions WHERE transactionId = ?`,[transactionId])
        let trnsdtls = await req.dba.query(`SELECT * FROM transactiondetails WHERE transactionDetailsId = ? `,[transactionDetailsId])
        
        return {
          attendees: {
            transactionId:transactionId,
            transactionDetailsId: transactionDetailsId,
            ...rest
          },
          transactions:trns[0],
          transactiondetails:trnsdtls[0]
        }
      })

      res.status(200).json(results)
    }catch(err){
      next(err)
    }
  }
}
