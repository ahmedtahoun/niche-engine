import type { NicheConfig } from '@niche-engine/core';

export function Footer({ cfg }: { cfg: NicheConfig }) {
  return (
    <footer className="foot">
      <div className="trust">
        {cfg.risk.openBeforePay && <div>افتحي الشحنة قبل ما تدفعي</div>}
        <div>استبدال مجاني خلال 14 يوم</div>
        <div>سجل تجاري مسجل في مصر</div>
      </div>
      <div className="row"><span>واتساب خدمة العملاء</span><span className="num" dir="ltr">0100 000 0000</span></div>
      <div className="row"><span>مواعيد الرد</span><span>كل يوم من 10 ص لـ 10 م</span></div>
      <div className="links"><span>سياسة الاستبدال</span><span>الشحن والتوصيل</span><span>الخصوصية</span><span>بيعي معانا</span></div>
      <span className="muted">{cfg.brand.nameAr} · {cfg.brand.domain}</span>
    </footer>
  );
}
