import * as admin from "firebase-admin";

export async function incrementUsage(userId: string): Promise<void> {
  const db = admin.firestore();
  const userRef = db.collection("users").doc(userId);
  const currentMonth = new Date().toISOString().slice(0, 7);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    const data = snap.data();

    if (!data) return;

    const usage = data.apiUsage || { month: currentMonth, routeRequests: 0 };

    if (usage.month !== currentMonth) {
      // New month — reset counter
      tx.update(userRef, {
        apiUsage: { month: currentMonth, routeRequests: 1 },
      });
    } else {
      tx.update(userRef, {
        "apiUsage.routeRequests": usage.routeRequests + 1,
      });
    }
  });
}
