import prisma from "../exportPrisma.js";
import jwt from "jsonwebtoken";
import nodeMailer from "nodemailer";
import bcrypt from "bcrypt";
import redis from "../redis.js";

const serverError = (res, err) => {
  res.status(500).end("Server error");
  console.log(err);
};

const encrypt = async (pass) => {
  const hashed = await bcrypt.hash(pass, +process.env.SALTROUNDS);
  return hashed;
};

const verifyToken = (token) => {
  token = token.split(" ")[1];
  const decodedToken = jwt.verify(token, process.env.key);
  return decodedToken;
};

const verifyPass = async (pass, hashedPass) => {
  const match = await bcrypt.compare(pass, hashedPass);
  return match;
};

const verifyOtp = async (email, otp) => {
  try {
    const redisOtp = await redis.get(email);
    if (!redisOtp) return false;
    const passed = redisOtp === otp;
    if (passed) {
      await removeOtp(email);
    }
  } catch (err) {
    return null;
  }
};

const transporter = nodeMailer.createTransport({
  port: 465,
  host: "smtp.gmail.com",
  auth: {
    user: process.env.USER,
    pass: process.env.PASS,
  },
  secure: true,
});

const saveOtps = async (email, time, otp) => {
  await redis.set(email, otp, "EX", 180);
};

const generateOtp = async (email) => {
  try {
    const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];
    let otp = "";

    for (let c = 1; c <= 6; c++) {
      otp += nums[Math.floor(Math.random() * nums.length)];
    }

    await saveOtps(email, 180, otp);
    if (!otp) return null;
    return otp;
  } catch (err) {
    return null;
  }
};

const removeOtp = async (email) => {
  try {
    await redis.del(email);
  } catch (err) {
    return null;
  }
};

export const getOtp = async (req, res) => {
  try {
    const { userData } = req.body;
    if (
      !(
        userData.name ||
        userData.email ||
        userData.age ||
        userData.gender ||
        userData.mobile ||
        userData.address ||
        userData.password
      )
    )
      return res.status(400).end("Bad Request");

    const otp = await generateOtp(userData.email);

    if (!otp) return serverError(res, "Otp generation failed.");

    const mailData = {
      from: process.env.USER,
      to: userData.email,
      subject: "E-mail validification for Flint.",
      text: `
      Your otp for your flint account creation is ${otp}. Please do not share it with anyone.
      `,
      html: `
      Your otp for your flint account creation is <b>${otp}</b>. Please do not share it with anyone.
      `,
    };

    transporter.sendMail(mailData, (err, info) => {
      if (err) return serverError(err);
      console.log(info);
      res.status(200).json({
        success: true,
      });
    });
  } catch (err) {
    serverError(res, err);
  }
};

export const signIn = async (req, res) => {
  try {
    const { userData } = req.body;
    if (!userData.email || !userData.password)
      return res.status(400).end("Bad req");
    const user = await prisma.user.findUnique({
      where: {
        email: userData.email,
      },
    });
    if (!user) return res.status(404).end("User does not exist");
    const passMatched = await verifyPass(userData.password, user.password);
    if (!user || !passMatched)
      return res.status(400).end("Either email or password are incorrect");

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        Role: user.Role,
      },
      process.env.key
    );

    res.status(200).json({ user, token });
  } catch (err) {
    serverError(res, err);
  }
};

export const validate = async (req, res) => {
  const { userData, otp } = req.body;
  const { email } = userData;

  const passed = await verifyOtp(email, otp);

  if (!passed) return res.status(403).end("Otp expired or incorrect");

  const hashed = await encrypt(userData.password);

  const user = await prisma.user.create({
    data: {
      ...userData,
      password: hashed,
    },
  });

  const token = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      Role: user.Role,
    },
    process.env.key
  );

  res.status(200).json({ user, token });
};

export const upDatePasswordOtp = async (req, res) => {
  const { email } = req.body;

  const otp = await generateOtp(email);

  if (!otp) return serverError(res, "Otp generation failed.");

  const mailData = {
    from: process.env.USER,
    to: email,
    text: `
    Your otp for updating your Flint account password is ${otp}.
    Please do not share it with anyone.
    `,
    html: `
    Your otp for updating your Flint account password is <b> ${otp} </b>. 
    Please do not ahre it with anyone.
    `,
    subject: "Otp for updating Flint account password",
  };

  transporter.sendMail(mailData, (err, info) => {
    if (err) return serverError(err);
    console.log(info);
    res.status(200).json({ success: true });
  });
};

export const updatePasswordVerify = async (req, res) => {
  try {
    const { otp, email } = req.body;

    const passed = await verifyOtp(email, otp);

    if (!passed) return res.status(403).end("Otp expired or does not exist.");

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    const token = jwt.sign(
      {
        userId: user.id,
        Role: user.Role,
        email,
      },
      process.env.key
    );

    res.status(200).json({ token, user });
  } catch (err) {
    return serverError(res, err);
  }
};

export const upDatePassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    const token = req.headers.token;

    const decodedToken = verifyToken(token);

    const hashed = await encrypt(newPassword);
    const user = await prisma.user.update({
      where: {
        id: decodedToken.userId,
      },
      data: {
        password: hashed,
      },
    });
    res.status(200).json({ user, token });
  } catch (err) {
    return serverError(res, err);
  }
};
