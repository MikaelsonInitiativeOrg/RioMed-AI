"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/session";
import { addFacilityTest, removeFacilityTest, updateFacilityTest, type CatalogueResult } from "@riomed/backend/server/catalogue";

const PATH = "/staff/catalogue";

async function run(fn: (actor: NonNullable<Awaited<ReturnType<typeof getSessionUser>>>) => Promise<CatalogueResult>) {
  const actor = await getSessionUser();
  if (!actor) redirect(`/account?mode=access&next=${encodeURIComponent(PATH)}`);
  let result: CatalogueResult;
  try {
    result = await fn(actor);
  } catch {
    result = { ok: false, error: "Could not save the change. Please try again." };
  }
  revalidatePath(PATH);
  if (result.ok) redirect(`${PATH}?saved=${encodeURIComponent(result.message)}`);
  redirect(`${PATH}?error=${encodeURIComponent(result.error)}`);
}

export async function updateTestAction(formData: FormData) {
  await run((actor) =>
    updateFacilityTest(actor, { testCode: formData.get("testCode"), price: formData.get("price"), turnaroundHours: formData.get("turnaroundHours") }),
  );
}

export async function addTestAction(formData: FormData) {
  await run((actor) =>
    addFacilityTest(actor, { testCode: formData.get("testCode"), price: formData.get("price"), turnaroundHours: formData.get("turnaroundHours") }),
  );
}

export async function removeTestAction(formData: FormData) {
  await run((actor) => removeFacilityTest(actor, { testCode: formData.get("testCode") }));
}
