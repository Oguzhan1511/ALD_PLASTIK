"use server";

import { prisma } from "../prisma";
import { revalidatePath } from "next/cache";
import { executeProduction } from "./uretim";
import { requireAuth } from "../auth-guard";

// ─────────────────────────────────────────────
// Makineleri Getir (ve yoksa 11 tane oluştur)
// ─────────────────────────────────────────────
export async function getMachines() {
  let machines = await prisma.machine.findMany({
    orderBy: { name: "asc" },
  });

  if (machines.length === 0) {
    const defaultMachines = Array.from({ length: 11 }).map((_, i) => ({
      name: `Makine ${i + 1}`,
      isActive: true,
    }));
    await prisma.machine.createMany({
      data: defaultMachines,
    });
    machines = await prisma.machine.findMany({
      orderBy: { name: "asc" },
    });
  }

  // Makine adında sayıları düzgün sıralamak için (Makine 1, Makine 2 ... Makine 10)
  machines.sort((a, b) => {
    const numA = parseInt(a.name.replace("Makine ", "")) || 0;
    const numB = parseInt(b.name.replace("Makine ", "")) || 0;
    return numA - numB;
  });

  return machines;
}

// ─────────────────────────────────────────────
// Belirli bir tarihteki tüm iş planlarını getir
// ─────────────────────────────────────────────
export async function getJobSchedules(dateStr: string) {
  // Gelen tarih (YYYY-MM-DD) için günün başlangıcı ve sonu
  const startOfDay = new Date(dateStr);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(dateStr);
  endOfDay.setHours(23, 59, 59, 999);

  const schedules = await prisma.jobSchedule.findMany({
    where: {
      OR: [
        { startTime: { gte: startOfDay, lte: endOfDay } },
        { endTime: { gte: startOfDay, lte: endOfDay } },
        { startTime: { lte: startOfDay }, endTime: { gte: endOfDay } }
      ]
    },
    include: {
      product: true,
      rawMaterial: true,
      machine: true,
    },
    orderBy: {
      startTime: "asc",
    },
  });

  return schedules.map(s => ({
    ...s,
    expectedQty: s.expectedQty ? s.expectedQty.toNumber() : null,
  }));
}

// ─────────────────────────────────────────────
// Ürünleri ve Hammaddeleri Getir (Seçim kutuları için)
// ─────────────────────────────────────────────
export async function getProductsAndRawMaterials() {
  const [products, rawMaterials] = await Promise.all([
    prisma.product.findMany({ 
      where: { isDeleted: false }, 
      orderBy: { name: 'asc' },
      include: {
        recipes: {
          include: { rawMaterial: true }
        }
      }
    }),
    prisma.rawMaterial.findMany({ 
      where: { isDeleted: false }, 
      orderBy: { name: 'asc' } 
    })
  ]);

  const mappedProducts = products.map(p => ({
    ...p,
    recipes: p.recipes.map(r => ({
      ...r,
      quantityPerUnit: r.quantityPerUnit ? r.quantityPerUnit.toNumber() : 0,
      wastePercentage: r.wastePercentage ? r.wastePercentage.toNumber() : 0,
    }))
  }));

  const mappedRawMaterials = rawMaterials.map(rm => ({
    ...rm,
    currentStock: rm.currentStock ? rm.currentStock.toNumber() : 0,
  }));

  return { products: mappedProducts, rawMaterials: mappedRawMaterials };
}

// ─────────────────────────────────────────────
// Belirli Bir Tarih Aralığındaki İş Planlarını Getir (Ustalar İçin)
// ─────────────────────────────────────────────
export async function getWeeklyJobSchedules(startDateStr: string, endDateStr: string) {
  const start = new Date(`${startDateStr}T00:00:00`);
  const end = new Date(`${endDateStr}T23:59:59`);

  return prisma.jobSchedule.findMany({
    where: {
      startTime: { gte: start, lte: end },
    },
    include: {
      machine: true,
      product: true,
      rawMaterial: true,
    },
    orderBy: [
      { machine: { name: 'asc' } },
      { startTime: 'asc' }
    ],
  });
}

// ─────────────────────────────────────────────
// Usta İş Takip Linki İçin Token Getir
// ─────────────────────────────────────────────
export async function getUstaIsTakibiToken() {
  await requireAuth();
  return process.env.USTA_IS_TAKIBI_TOKEN || "8c92a15f0b4d458693c12ab7d8e9f2a411";
}

// ─────────────────────────────────────────────
// İş Planı Ekle
// ─────────────────────────────────────────────
export async function createJobSchedule(data: {
  machineId: string;
  productId: string;
  rawMaterialId?: string | null;
  startTime: Date;
  endTime: Date;
  expectedQty?: number | null;
  status?: string;
  notes?: string;
}) {
  const newJob = await prisma.jobSchedule.create({
    data: {
      machineId: data.machineId,
      productId: data.productId,
      rawMaterialId: data.rawMaterialId || null,
      startTime: data.startTime,
      endTime: data.endTime,
      expectedQty: data.expectedQty || null,
      status: data.status || "PLANLANDI",
      notes: data.notes,
    },
  });
  revalidatePath("/is-takibi");
  return newJob;
}

// ─────────────────────────────────────────────
// İş Planı Güncelle
// ─────────────────────────────────────────────
export async function updateJobSchedule(id: string, data: {
  machineId?: string;
  productId?: string;
  rawMaterialId?: string | null;
  startTime?: Date;
  endTime?: Date;
  expectedQty?: number | null;
  status?: string;
  notes?: string;
}) {
  const updated = await prisma.jobSchedule.update({
    where: { id },
    data: {
      machineId: data.machineId,
      productId: data.productId,
      rawMaterialId: data.rawMaterialId,
      startTime: data.startTime,
      endTime: data.endTime,
      expectedQty: data.expectedQty,
      status: data.status,
      notes: data.notes,
    },
  });
  revalidatePath("/is-takibi");
  return updated;
}

// ─────────────────────────────────────────────
// İş Planını Tamamla ve Üretime İşle
// ─────────────────────────────────────────────
export async function completeJobSchedule(id: string, actualQty: number) {
  
  const job = await prisma.jobSchedule.findUnique({ where: { id }, include: { machine: true } });
  if (!job) throw new Error("İş planı bulunamadı.");
  if (job.status === "TAMAMLANDI") throw new Error("Bu iş planı zaten tamamlanmış.");

  // 1. İş planını tamamlandı olarak işaretle
  const updated = await prisma.jobSchedule.update({
    where: { id },
    data: {
      status: "TAMAMLANDI",
      // İsteğe bağlı: gerçekleşen miktarı notlara ekleyebiliriz
      notes: job.notes ? `${job.notes}\n(Gerçekleşen Üretim: ${actualQty})` : `Gerçekleşen Üretim: ${actualQty}`,
    },
  });

  // 2. Sisteme üretim olarak gir
  try {
    await executeProduction(
      job.productId,
      actualQty,
      new Date(),
      `İş Takibi (Oto Üretim) - ${job.machine?.name}`
    );
  } catch (err: any) {
    // Üretim eklerken hata olursa iş planını geri alalım ki kullanıcı tekrar deneyebilsin (örneğin stok yetersizse)
    await prisma.jobSchedule.update({
      where: { id },
      data: { status: job.status, notes: job.notes },
    });
    throw new Error(`Üretim kaydedilemedi: ${err.message}`);
  }

  revalidatePath("/is-takibi");
  revalidatePath("/uretim");
  revalidatePath("/hammaddeler");
  revalidatePath("/urunler");
  revalidatePath("/hareketler");
  return updated;
}

// ─────────────────────────────────────────────
// İş Planı Sil
// ─────────────────────────────────────────────
export async function deleteJobSchedule(id: string) {
  await prisma.jobSchedule.delete({ where: { id } });
  revalidatePath("/is-takibi");
  return { success: true };
}
