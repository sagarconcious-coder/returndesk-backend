import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendOtpEmail = async (email, otp) => {
  try {
    const { data, error } = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: `${email}`,
      subject: "Dealer Registration OTP",
      html: `<p>Your OTP is <strong>${otp}</strong>!</p>`,
    });
    if (error) throw new Error(`Email failed: ${error.message}`);
  } catch (error) {
    throw new Error(error);
  }
};
