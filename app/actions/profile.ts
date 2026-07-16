
"use server";

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

    // Get original extension
    const originalExt = file.name.split(".").pop() || "png";
    const fileName = `student-${studentId}-${Date.now()}.${originalExt}`;

    // Upload to Supabase storage bucket root (uploading original file directly)
    const { error: uploadError } = await supabase.storage
      .from("profile-pictures")
      .upload(fileName, buffer, {
        contentType: file.type,
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

    // Fetch existing student profile to get the old profile picture URL
    const currentStudent = await prisma.studentProfile.findUnique({
      where: { id: studentId },
      select: { profilePictureUrl: true },
    });

    // Update database
    const updatedStudent = await prisma.studentProfile.update({
      where: { id: studentId },
      data: { profilePictureUrl: publicUrl },
      select: { institutionId: true },
    });

    // Delete the old profile picture from Supabase storage if it exists
    if (currentStudent?.profilePictureUrl) {
      try {
        const parts = currentStudent.profilePictureUrl.split("/profile-pictures/");
        if (parts.length > 1) {
          const oldFileName = parts[1];
          await supabase.storage.from("profile-pictures").remove([oldFileName]);
          console.log(`Deleted old profile picture: ${oldFileName}`);
        }
      } catch (err) {
        console.error("Failed to delete old profile picture from storage:", err);
      }
    }

    const institutionId = updatedStudent.institutionId;
    if (!institutionId) {
      throw new Error("Student's institution could not be resolved.");
    }

    // Call Python microservice to process the profile photo and save the face embedding
    try {
      const pythonServiceUrl = process.env.NEXT_PUBLIC_FACIAL_API_URL || "http://localhost:8000";
      const processRes = await fetch(`${pythonServiceUrl}/process-student-photo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          photoUrl: publicUrl,
          institutionId,
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
