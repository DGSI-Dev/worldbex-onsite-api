import jwt from "jsonwebtoken";

import crypto from "../../crypto";
export default async (req, res, next) => {
  const authorizationHeader = req.headers["authorization"];
  let token;

  if (authorizationHeader) {
    token = authorizationHeader.split(" ")[1];
  }
  if (token) {
    jwt.verify(token, process.env.jwtSecretKey, async (err, decoded) => {
      if (err) {
        res.status(400).json({
          error: 400,
          status: "failed",
          message: "Failed to authenticate",
        });
      } else {
        const { userId } = decoded;
        try {
          let result = await req.dba.query(
            `SELECT * 
            FROM users 
            WHERE userId = ?`,
            [userId]
          );
          const member = result[0];
          if (!member) {
            res.status(401).json({
              error: 401,
              status: "failed",
              message: "Failed to authenticate",
            });
          } else if (member.isDeleted == 1) {
            res.status(410).json({
              error: 410,
              status: "failed",
              message: "This account has been deleted",
            });
          } else {
            req.currentUser = JSON.parse(JSON.stringify(member));
            next();
          }
        } catch (err) {
          next(err);
        }
      }
    });
  } else {
    res
      .status(401)
      .json({ error: 401, status: "failed", message: "No token provided" });
  }
};
