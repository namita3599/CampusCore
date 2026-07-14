"use server";

import sharp from "sharp";
import { supabase } from "@/lib/supabase";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function uploadProfilePicture(formData: FormData) {
  try {
    const file = formData.get("file") as File;
    const studentIdStr = formData.get("studentId") as string;

    if (!file || !studentIdStr) {
      return { success: false, error: "Missing file or student ID" };
    }

    const studentId = parseInt(studentIdStr);

    // Convert file to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Compress and resize using sharp
    const optimizedBuffer = await sharp(buffer)
      .resize(800, 800, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 80 })
      .toBuffer();

    const fileName = `student-${studentId}-${Date.now()}.webp`;

    // Upload to Supabase storage bucket root
    const { error: uploadError } = await supabase.storage
      .from("profile-pictures")
      .upload(fileName, optimizedBuffer, {
        contentType: "image/webp",
        upsert: true,
      });

    if (uploadError) {
      return { success: false, error: uploadError.message };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("profile-pictures")
      .getPublicUrl(fileName);

    const publicUrl = urlData.publicUrl;

    // Update database
    await prisma.studentProfile.update({
      where: { id: studentId },
      data: { profilePictureUrl: publicUrl },
    });

    // Call Python microservice to process the profile photo and save the face embedding
    try {
      const pythonServiceUrl = process.env.NEXT_PUBLIC_FACIAL_API_URL || "http://localhost:8000";
      const processRes = await fetch(`${pythonServiceUrl}/process-student-photo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          photoUrl: publicUrl,
        }),
      });

      if (!processRes.ok) {
        const errorData = await processRes.json().catch(() => ({})) as { detail?: string };
        console.error("Failed to generate face embedding:", errorData.detail || "Unknown error");
      } else {
        console.log("Successfully generated face embedding for studentId:", studentId);
      }
    } catch (err) {
      console.error("Error calling facial recognition service:", err);
    }

    revalidatePath("/dashboard/student/profile");
    revalidatePath("/dashboard/student");
    revalidatePath("/dashboard/admin/users/students");

    return { success: true, url: publicUrl };
  } catch (error: any) {
    return { success: false, error: error.message || "An unexpected error occurred" };
  }
}
