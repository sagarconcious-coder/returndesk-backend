import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: (process.env.GMAIL_APP_PASSWORD || "").replace(/\s+/g, ""),
  },
});

export const sendOtpEmail = async (email, otp) => {
  const res = await transporter.sendMail({
    from: process.env.GMAIL_USER,
    to: email,
    subject: "Dealer Registration OTP",
    html: `<p>Your OTP is <strong>${otp}</strong>!</p>`,
  });
  return res;
};
