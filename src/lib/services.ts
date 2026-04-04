/**
 * Sample salon services — shown in the onboarding/setup flow
 * These get seeded when a new salon owner first creates their shop
 */

export const SAMPLE_SERVICES = [
  {
    name: 'قص شعر',
    nameEn: 'Haircut',
    description: 'قص وتهذيب شعر حسب أسلوبك',
    duration_min: 45,
    price: 8,
    category: 'hair',
  },
  {
    name: 'صبغ شعر',
    nameEn: 'Hair Coloring',
    description: 'صبغ كامل باللون المطلوب',
    duration_min: 120,
    price: 25,
    category: 'hair',
  },
  {
    name: 'علاج شعر',
    nameEn: 'Hair Treatment',
    description: 'علاج مغذي وترطيب عميق للشعر',
    duration_min: 60,
    price: 15,
    category: 'hair',
  },
  {
    name: 'أظافر أكريليك',
    nameEn: 'Acrylic Nails',
    description: 'تركيب أظافر أكريليك بألوان مختلفة',
    duration_min: 90,
    price: 20,
    category: 'nails',
  },
  {
    name: 'مانيكير وبيديكير',
    nameEn: 'Manicure & Pedicure',
    description: 'عناية بالأظافر واليدين والقدمين',
    duration_min: 60,
    price: 12,
    category: 'nails',
  },
  {
    name: 'مكياج سهرة',
    nameEn: 'Evening Makeup',
    description: 'مكياج سهرة احترافي',
    duration_min: 60,
    price: 30,
    category: 'makeup',
  },
  {
    name: 'مكياج عرائس',
    nameEn: 'Bridal Makeup',
    description: 'مكياج عرائس كامل مع تجربة',
    duration_min: 120,
    price: 60,
    category: 'makeup',
  },
  {
    name: 'عناية بالوجه',
    nameEn: 'Facial',
    description: 'تنظيف وعناية بالبشرة',
    duration_min: 45,
    price: 15,
    category: 'skincare',
  },
  {
    name: 'إزالة شعر بالشمع',
    nameEn: 'Waxing',
    description: 'إزالة شعر بالشمع للوجه واليدين والقدمين',
    duration_min: 30,
    price: 8,
    category: 'body',
  },
  {
    name: 'باقة عروس كاملة',
    nameEn: 'Full Bridal Package',
    description: 'مكياج عرائس + قصة شعر + أظافر + عناية بالوجه',
    duration_min: 240,
    price: 120,
    category: 'package',
  },
]

export const SERVICE_CATEGORIES = [
  { key: 'hair', label: 'شعر', labelEn: 'Hair' },
  { key: 'nails', label: 'أظافر', labelEn: 'Nails' },
  { key: 'makeup', label: 'مكياج', labelEn: 'Makeup' },
  { key: 'skincare', label: 'عناية بالبشرة', labelEn: 'Skincare' },
  { key: 'body', label: 'جسم', labelEn: 'Body' },
  { key: 'package', label: 'باقات', labelEn: 'Packages' },
]
