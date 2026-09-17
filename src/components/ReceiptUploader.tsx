<label className="btn">
  📷 แนบ/สแกนใบเสร็จ
  <input
    type="file"
    accept="image/*,.pdf"
    capture="environment"
    hidden
    onChange={async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const path = `receipts/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from('receipts').upload(path, file);
      if (error) alert('อัปโหลดไม่สำเร็จ: ' + error.message);
    }}
  />
</label>