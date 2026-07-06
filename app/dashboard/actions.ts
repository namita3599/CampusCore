"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

export async function changePasswordForcefully(
  userId: number,
  currentPass: string,
  newPass: string
) {
  if (!currentPass || !newPass) {
    throw new Error("Both current password and new password are required.");
  }

  if (newPass.length < 8) {
    throw new Error("New password must be at least 8 characters long.");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error("User not found.");
  }

  // Verify current password
  const match = await bcrypt.compare(currentPass, user.hashedPassword);
  if (!match) {
    throw new Error("Current password verification failed. Please enter the correct temporary password.");
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(newPass, 12);

  // Update in DB
  await prisma.user.update({
    where: { id: userId },
    data: {
      hashedPassword,
      forcePasswordChange: false,
    },
  });

  revalidatePath("/dashboard", "layout");
}
