import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { Role } from "@prisma/client";

// Normalize column headers/keys to camelCase or lowercase for easier extraction
function getRowValue(row: any, candidates: string[]): string | undefined {
  for (const c of candidates) {
    if (row[c] !== undefined && row[c] !== null && String(row[c]).trim() !== "") {
      return String(row[c]).trim();
    }
  }
  return undefined;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const type = formData.get("type") as "student" | "teacher" | "warden";

    if (!file || !type) {
      return NextResponse.json({ error: "File and user type are required." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json(worksheet);

    if (rawRows.length === 0) {
      return NextResponse.json({ error: "The Excel file is empty." }, { status: 400 });
    }

    const results = {
      total: rawRows.length,
      successCount: 0,
      failCount: 0,
      errors: [] as { row: number; name: string; error: string }[],
    };

    // Nodemailer transporter (same settings as actions)
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Verify SMTP connection once before loop
    await new Promise<void>((resolve, reject) => {
      transporter.verify((err) => (err ? reject(err) : resolve()));
    });

    for (let i = 0; i < rawRows.length; i++) {
      const row: any = rawRows[i];
      const rowNum = i + 2; // Row number in Excel (1-indexed header is row 1)

      try {
        if (type === "student") {
          const name = getRowValue(row, ["Name", "name", "Full Name", "fullName"]);
          const branch = getRowValue(row, ["Branch", "branch"]);
          const rollNumber = getRowValue(row, ["Roll Number", "rollNumber", "Roll No", "rollNo", "RollNo"]);
          const phone = getRowValue(row, ["Phone", "phone", "Mobile", "mobile", "Phone Number"]);
          const guardianName = getRowValue(row, ["Guardian Name", "guardianName", "Guardian", "guardian"]);
          const yearOfAdmissionStr = getRowValue(row, ["Year of Admission", "yearOfAdmission", "Admission Year", "admissionYear"]);
          const bloodGroup = getRowValue(row, ["Blood Group", "bloodGroup", "Blood", "blood"]);
          const email = getRowValue(row, ["Email", "email", "Email ID", "emailId"]);

          if (!name || !branch || !rollNumber || !phone || !guardianName || !yearOfAdmissionStr || !email) {
            throw new Error("Missing required student fields.");
          }

          const yearOfAdmission = Number(yearOfAdmissionStr);
          if (isNaN(yearOfAdmission) || yearOfAdmission < 2000 || yearOfAdmission > 2100) {
            throw new Error(`Invalid year of admission: ${yearOfAdmissionStr}`);
          }

          const username = (branch.substring(0, 2) + rollNumber).toLowerCase();
          const tempPassword = randomBytes(4).toString("hex");
          const hashedPassword = await bcrypt.hash(tempPassword, 12);

          // Save Student inside Transaction
          await prisma.$transaction(async (tx) => {
            const duplicateRoll = await tx.studentProfile.findFirst({ where: { rollNumber } });
            if (duplicateRoll) throw new Error(`Roll number ${rollNumber} already registered.`);

            const duplicateUsername = await tx.user.findUnique({ where: { username } });
            if (duplicateUsername) throw new Error(`Username ${username} already exists.`);

            const duplicateEmail = await tx.user.findUnique({ where: { email } });
            if (duplicateEmail) throw new Error(`Email ${email} already registered.`);

            await tx.user.create({
              data: {
                username,
                email,
                hashedPassword,
                role: Role.STUDENT,
                forcePasswordChange: true,
                studentProfile: {
                  create: {
                    name,
                    branch,
                    rollNumber,
                    phone,
                    guardianName,
                    yearOfAdmission,
                    ...(bloodGroup ? { bloodGroup } : {}),
                  },
                },
              },
            });
          });

          // Send Email
          await transporter.sendMail({
            from: `"CampusCore" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: "Your CampusCore Account Credentials",
            html: `
              <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px;border:1px solid #e5e7eb;border-radius:12px;">
                <h2 style="color:#111827;margin-bottom:8px;">Welcome to CampusCore &#127891;</h2>
                <p style="color:#6b7280;">Your student account has been created via bulk upload. Use the credentials below to log in.</p>
                <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin:24px 0;">
                  <p style="margin:0 0 8px;"><strong>Username:</strong> <code style="background:#e5e7eb;padding:2px 6px;border-radius:4px;">${username}</code></p>
                  <p style="margin:0;"><strong>Temporary Password:</strong> <code style="background:#e5e7eb;padding:2px 6px;border-radius:4px;">${tempPassword}</code></p>
                </div>
                <p style="color:#ef4444;font-size:14px;">&#9888;&#65039; You will be required to change your password on first login.</p>
              </div>
            `,
          });

        } else if (type === "teacher") {
          const name = getRowValue(row, ["Name", "name", "Full Name", "fullName"]);
          const phone = getRowValue(row, ["Phone", "phone", "Mobile", "mobile"]);
          const email = getRowValue(row, ["Email", "email", "Email ID", "emailId"]);
          const subjectName = getRowValue(row, ["Subject Name", "subjectName", "Subject", "subject"]);

          if (!name || !phone || !email) {
            throw new Error("Missing name, phone, or email.");
          }

          const baseUsername = name.split(" ")[0].toLowerCase().replace(/[^a-z]/g, "");
          const suffix = randomBytes(2).toString("hex");
          const username = `${baseUsername}_${suffix}`;

          const tempPassword = randomBytes(4).toString("hex");
          const hashedPassword = await bcrypt.hash(tempPassword, 12);

          let subjectId: number | undefined = undefined;
          if (subjectName) {
            const subject = await prisma.subject.findUnique({ where: { name: subjectName } });
            if (subject) subjectId = subject.id;
          }

          // Save Teacher
          await prisma.$transaction(async (tx) => {
            const duplicateEmail = await tx.user.findUnique({ where: { email } });
            if (duplicateEmail) throw new Error(`Email ${email} already registered.`);

            const duplicateUsername = await tx.user.findUnique({ where: { username } });
            if (duplicateUsername) throw new Error(`Username ${username} already exists.`);

            await tx.user.create({
              data: {
                username,
                email,
                hashedPassword,
                role: Role.TEACHER,
                forcePasswordChange: true,
                teacherProfile: {
                  create: {
                    name,
                    phone,
                    ...(subjectId ? { subjects: { connect: [{ id: subjectId }] } } : {}),
                  },
                },
              },
            });
          });

          // Send Email
          await transporter.sendMail({
            from: `"CampusCore" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: "Your CampusCore Teacher Account Credentials",
            html: `
              <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px;border:1px solid #e5e7eb;border-radius:12px;">
                <h2 style="color:#111827;margin-bottom:8px;">Welcome to CampusCore &#127891;</h2>
                <p style="color:#6b7280;">Your teacher account has been created via bulk upload. Use the credentials below to log in.</p>
                <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin:24px 0;">
                  <p style="margin:0 0 8px;"><strong>Username:</strong> <code style="background:#e5e7eb;padding:2px 6px;border-radius:4px;">${username}</code></p>
                  <p style="margin:0;"><strong>Temporary Password:</strong> <code style="background:#e5e7eb;padding:2px 6px;border-radius:4px;">${tempPassword}</code></p>
                </div>
                <p style="color:#ef4444;font-size:14px;">&#9888;&#65039; You will be required to change your password on first login.</p>
              </div>
            `,
          });

        } else if (type === "warden") {
          const name = getRowValue(row, ["Name", "name", "Full Name", "fullName"]);
          const phone = getRowValue(row, ["Phone", "phone", "Mobile", "mobile"]);
          const email = getRowValue(row, ["Email", "email", "Email ID", "emailId"]);
          const hostelName = getRowValue(row, ["Hostel Name", "hostelName", "Hostel", "hostel"]);

          if (!name || !phone || !email) {
            throw new Error("Missing name, phone, or email.");
          }

          const baseUsername = name.split(" ")[0].toLowerCase().replace(/[^a-z]/g, "");
          const suffix = randomBytes(2).toString("hex");
          const username = `${baseUsername}_${suffix}`;

          const tempPassword = randomBytes(4).toString("hex");
          const hashedPassword = await bcrypt.hash(tempPassword, 12);

          let hostelId: number | undefined = undefined;
          if (hostelName) {
            const hostel = await prisma.hostel.findUnique({ where: { name: hostelName } });
            if (hostel) hostelId = hostel.id;
          }

          // Save Warden
          await prisma.$transaction(async (tx) => {
            const duplicateEmail = await tx.user.findUnique({ where: { email } });
            if (duplicateEmail) throw new Error(`Email ${email} already registered.`);

            const duplicateUsername = await tx.user.findUnique({ where: { username } });
            if (duplicateUsername) throw new Error(`Username ${username} already exists.`);

            await tx.user.create({
              data: {
                username,
                email,
                hashedPassword,
                role: Role.WARDEN,
                forcePasswordChange: true,
                wardenProfile: {
                  create: {
                    name,
                    phone,
                    ...(hostelId ? { hostels: { connect: [{ id: hostelId }] } } : {}),
                  },
                },
              },
            });
          });

          // Send Email
          await transporter.sendMail({
            from: `"CampusCore" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: "Your CampusCore Warden Account Credentials",
            html: `
              <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px;border:1px solid #e5e7eb;border-radius:12px;">
                <h2 style="color:#111827;margin-bottom:8px;">Welcome to CampusCore &#127891;</h2>
                <p style="color:#6b7280;">Your warden account has been created via bulk upload. Use the credentials below to log in.</p>
                <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin:24px 0;">
                  <p style="margin:0 0 8px;"><strong>Username:</strong> <code style="background:#e5e7eb;padding:2px 6px;border-radius:4px;">${username}</code></p>
                  <p style="margin:0;"><strong>Temporary Password:</strong> <code style="background:#e5e7eb;padding:2px 6px;border-radius:4px;">${tempPassword}</code></p>
                </div>
                <p style="color:#ef4444;font-size:14px;">&#9888;&#65039; You will be required to change your password on first login.</p>
              </div>
            `,
          });
        }

        results.successCount++;
      } catch (err: any) {
        results.failCount++;
        const rowName = String(row["Name"] || row["name"] || `Row ${rowNum}`);
        results.errors.push({
          row: rowNum,
          name: rowName,
          error: err.message || "Unknown error",
        });
      }
    }

    return NextResponse.json(results);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Bulk upload failed." }, { status: 500 });
  }
}
