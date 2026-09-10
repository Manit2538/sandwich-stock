'use client';
import { useActionState, useState } from 'react';
import { addRecipeItem } from '../actions';

export default function RecipeItemForm({ recipeId, menuItemId, ingredients }: {
  recipeId: string; menuItemId: string; ingredients: any[];
}) {
  const [state, action, pending] = useActionState(addRecipeItem, null as any);
  const [ingId, setIngId] = useState('');
  const sel = ingredients.find((i) => i.id === ingId);

  return (
    <form action={action} className="mt-4 space-y-3 rounded-xl bg-stone-50 p-3 dark:bg-stone-800/50">
      <p className="text-sm font-semibold">➕ เพิ่ม/แก้ไขวัตถุดิบในสูตร</p>
      <input type="hidden" name="recipe_id" value={recipeId} />
      <input type="hidden" name="menu_item_id" value={menuItemId} />
      <input type="hidden" name="unit_id" value={sel?.base_unit_id ?? ''} />

      <select name="ingredient_id" required value={ingId} onChange={(e) => setIngId(e.target.value)}>
        <option value="">— เลือกวัตถุดิบ —</option>
        {ingredients.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.units?.name_th})</option>)}
      </select>

      <input name="qty" type="number" step="0.0001" min="0.0001" required inputMode="decimal"
        placeholder={sel ? `ปริมาณต่อ 1 ชิ้น (${sel.units?.name_th})` : 'ปริมาณต่อ 1 ชิ้น'} />

      {state?.error && <p className="text-sm text-danger">❌ {state.error}</p>}
      {state?.ok && <p className="text-sm text-ok">✅ {state.ok}</p>}
      <button className="btn-ghost w-full" disabled={pending || !ingId}>
        {pending ? 'กำลังบันทึก…' : 'บันทึกลงสูตร'}
      </button>
    </form>
  );
}