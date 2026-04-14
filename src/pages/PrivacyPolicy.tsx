export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-white" dir="rtl">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold mb-2">سياسة الخصوصية</h1>
        <h2 className="text-xl font-semibold mb-6 text-gray-500">Privacy Policy</h2>
        <p className="text-sm text-gray-500 mb-8">آخر تحديث: April 2026</p>

        <div className="space-y-6 text-sm leading-relaxed">
          <section>
            <h3 className="font-semibold text-base mb-2">1. المعلومات التي نجمعها</h3>
            <ul className="list-disc pr-6 mt-2 space-y-1">
              <li><strong>معلومات الحساب:</strong> الاسم، البريد الإلكتروني، رقم الهاتف</li>
              <li><strong>معلومات الstylist:</strong> الاسم، الصورة، ساعات العمل</li>
              <li><strong>بيانات الحجوزات:</strong> الموعد، الخدمة، الstylist</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-base mb-2">2. كيف نستخدم معلوماتك</h3>
            <ul className="list-disc pr-6 mt-2 space-y-1">
              <li>تقديم خدمات الحجز بينك وبين الstylist</li>
              <li>إدارة المواعيد والإشعارات</li>
              <li>دعم العملاء</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-base mb-2">3. حماية البيانات</h3>
            <p>نستخدم Supabase كمنصة آمنة للبيانات مع تشفير HTTPS. بيانات الدفع لا تمر عبر خوادمنا.</p>
          </section>

          <section>
            <h3 className="font-semibold text-base mb-2">4. حقوقك</h3>
            <ul className="list-disc pr-6 mt-2 space-y-1">
              <li>الوصول إلى بياناتك</li>
              <li>تصحيح البيانات غير الدقيقة</li>
              <li>طلب حذف حسابك</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-base mb-2">5. التواصل</h3>
            <p>لأسئلة الخصوصية: <a href="mailto:7o.kassab@gmail.com" className="text-blue-600 underline">7o.kassab@gmail.com</a></p>
          </section>
        </div>

        <hr className="my-8" />

        <div className="space-y-6 text-sm leading-relaxed">
          <h2 className="font-bold text-lg">Privacy Policy (English)</h2>
          <p className="text-sm text-gray-500">Last updated: April 2026</p>

          <section>
            <h3 className="font-semibold mb-2">1. Information We Collect</h3>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>Account info:</strong> Name, email, phone number</li>
              <li><strong>Stylist info:</strong> Name, photo, working hours</li>
              <li><strong>Booking data:</strong> Appointment time, service, barber</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold mb-2">2. How We Use Your Information</h3>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Facilitate booking between you and barbers</li>
              <li>Manage appointments and send notifications</li>
              <li>Customer support</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold mb-2">3. Data Security</h3>
            <p>We use Supabase as a secure data platform with HTTPS encryption. Payment data never touches our servers.</p>
          </section>

          <section>
            <h3 className="font-semibold mb-2">4. Your Rights</h3>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Access your data</li>
              <li>Correct inaccurate data</li>
              <li>Request account deletion</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold mb-2">5. Contact</h3>
            <p>For privacy questions: <a href="mailto:7o.kassab@gmail.com" className="text-blue-600 underline">7o.kassab@gmail.com</a></p>
          </section>
        </div>
      </div>
    </div>
  )
}
