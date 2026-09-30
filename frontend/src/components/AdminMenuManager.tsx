"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  ChevronDown,
  Edit3,
  GripVertical,
  ImagePlus,
  Loader2,
  Plus,
  Tag,
  Trash2,
  Upload,
  X,
  Zap,
} from "lucide-react";

type Category = {
  id: string;
  name: string;
  sortOrder: number;
  itemCount: number;
};

type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  available: boolean;
  featured: boolean;
  popular: boolean;
  todaySpecial: boolean;
  options: string | null;
  categoryId: string;
  category: { id: string; name: string };
};

type OptionsData = {
  variants: { name: string; priceAdj: number }[];
  addOns: { name: string; price: number }[];
  specialInstructions: string;
};

function parseOptions(raw: string | null): OptionsData {
  if (!raw) return { variants: [], addOns: [], specialInstructions: "" };
  try {
    const parsed = JSON.parse(raw);
    return {
      variants: Array.isArray(parsed.variants) ? parsed.variants : [],
      addOns: Array.isArray(parsed.addOns) ? parsed.addOns : [],
      specialInstructions: typeof parsed.specialInstructions === "string" ? parsed.specialInstructions : "",
    };
  } catch {
    return { variants: [], addOns: [], specialInstructions: "" };
  }
}

function toast(msg: string) {
  const el = document.createElement("div");
  el.className =
    "fixed bottom-6 left-1/2 z-[100] -translate-x-1/2 rounded-full border border-[var(--gold)]/40 bg-[var(--bg-card)] px-4 py-2 text-xs text-[var(--gold-bright)] shadow-lg pointer-events-none";
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1800);
}

const inputClass =
  "w-full rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2.5 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-dim)] focus:border-[var(--gold)]";

const btnGold = "rounded-lg bg-[var(--gold)] px-3 py-2 text-xs font-bold uppercase tracking-wider text-[var(--gold-bright)] transition hover:opacity-90 disabled:opacity-50";
const btnOutline = "rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-medium text-[var(--text-muted)] transition hover:border-[var(--gold)]/50 hover:text-[var(--gold-bright)] disabled:opacity-50";
const btnDanger = "rounded-lg border border-red-500/30 px-3 py-2 text-xs font-medium text-red-400 transition hover:bg-red-500/10 disabled:opacity-50";

export function AdminMenuManager() {
  const [tab, setTab] = useState<"categories" | "items">("categories");
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newCatName, setNewCatName] = useState("");
  const [newCatSort, setNewCatSort] = useState(0);
  const [creatingCat, setCreatingCat] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState("");
  const [editCatSort, setEditCatSort] = useState(0);
  const [savingCatId, setSavingCatId] = useState<string | null>(null);
  const [deletingCatId, setDeletingCatId] = useState<string | null>(null);

  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [savingItem, setSavingItem] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [itemName, setItemName] = useState("");
  const [itemDesc, setItemDesc] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemCategoryId, setItemCategoryId] = useState("");
  const [itemImageUrl, setItemImageUrl] = useState("");
  const [itemAvailable, setItemAvailable] = useState(true);
  const [itemFeatured, setItemFeatured] = useState(false);
  const [itemPopular, setItemPopular] = useState(false);
  const [itemTodaySpecial, setItemTodaySpecial] = useState(false);
  const [itemVariants, setItemVariants] = useState<{ name: string; priceAdj: number }[]>([]);
  const [itemAddOns, setItemAddOns] = useState<{ name: string; price: number }[]>([]);
  const [itemSpecialInstr, setItemSpecialInstr] = useState("");

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/categories");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setCategories(data.categories);
    } catch {
      setError("Failed to load categories");
    }
  }, []);

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/items");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setItems(data.items);
    } catch {
      setError("Failed to load menu items");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      await Promise.all([fetchCategories(), fetchItems()]);
      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [fetchCategories, fetchItems]);

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(null), 4000);
      return () => clearTimeout(t);
    }
  }, [error]);

  function openAddItemModal() {
    setEditingItem(null);
    setItemName("");
    setItemDesc("");
    setItemPrice("");
    setItemCategoryId(categories[0]?.id ?? "");
    setItemImageUrl("");
    setItemAvailable(true);
    setItemFeatured(false);
    setItemPopular(false);
    setItemTodaySpecial(false);
    setItemVariants([]);
    setItemAddOns([]);
    setItemSpecialInstr("");
    setShowItemModal(true);
  }

  function openEditItemModal(item: MenuItem) {
    setEditingItem(item);
    setItemName(item.name);
    setItemDesc(item.description ?? "");
    setItemPrice(String(item.price));
    setItemCategoryId(item.categoryId);
    setItemImageUrl(item.imageUrl ?? "");
    setItemAvailable(item.available);
    setItemFeatured(item.featured);
    setItemPopular(item.popular);
    setItemTodaySpecial(item.todaySpecial);
    const opts = parseOptions(item.options);
    setItemVariants(opts.variants);
    setItemAddOns(opts.addOns);
    setItemSpecialInstr(opts.specialInstructions);
    setShowItemModal(true);
  }

  async function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setCreatingCat(true);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCatName.trim(), sortOrder: newCatSort }),
      });
      if (!res.ok) throw new Error();
      setNewCatName("");
      setNewCatSort(0);
      toast("Category created");
      await fetchCategories();
    } catch {
      setError("Failed to create category");
    } finally {
      setCreatingCat(false);
    }
  }

  function startEditCat(cat: Category) {
    setEditingCatId(cat.id);
    setEditCatName(cat.name);
    setEditCatSort(cat.sortOrder);
  }

  async function saveEditCat(id: string) {
    if (!editCatName.trim()) return;
    setSavingCatId(id);
    try {
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editCatName.trim(), sortOrder: editCatSort }),
      });
      if (!res.ok) throw new Error();
      setEditingCatId(null);
      toast("Category updated");
      await Promise.all([fetchCategories(), fetchItems()]);
    } catch {
      setError("Failed to update category");
    } finally {
      setSavingCatId(null);
    }
  }

  async function deleteCategory(id: string) {
    setDeletingCatId(id);
    try {
      const res = await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to delete category");
        return;
      }
      toast("Category deleted");
      await fetchCategories();
    } catch {
      setError("Failed to delete category");
    } finally {
      setDeletingCatId(null);
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }
      const data = await res.json();
      setItemImageUrl(data.url);
      toast("Image uploaded");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSaveItem(e: React.FormEvent) {
    e.preventDefault();
    if (!itemName.trim() || !itemPrice || !itemCategoryId) return;
    setSavingItem(true);
    try {
      const optionsJson = JSON.stringify({
        variants: itemVariants,
        addOns: itemAddOns,
        specialInstructions: itemSpecialInstr,
      });

      const payload = {
        name: itemName.trim(),
        description: itemDesc.trim() || null,
        price: parseFloat(itemPrice),
        imageUrl: itemImageUrl || null,
        categoryId: itemCategoryId,
        available: itemAvailable,
        featured: itemFeatured,
        popular: itemPopular,
        todaySpecial: itemTodaySpecial,
        options: (itemVariants.length > 0 || itemAddOns.length > 0 || itemSpecialInstr.trim()) ? optionsJson : null,
      };

      const url = editingItem ? `/api/admin/items/${editingItem.id}` : "/api/admin/items";
      const method = editingItem ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }

      setShowItemModal(false);
      toast(editingItem ? "Item updated" : "Item created");
      await fetchItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save item");
    } finally {
      setSavingItem(false);
    }
  }

  async function deleteItem(id: string) {
    setDeletingItemId(id);
    try {
      const res = await fetch(`/api/admin/items/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast("Item deleted");
      await fetchItems();
    } catch {
      setError("Failed to delete item");
    } finally {
      setDeletingItemId(null);
    }
  }

  async function toggleItemField(id: string, field: string, value: boolean) {
    try {
      const res = await fetch(`/api/admin/items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) throw new Error();
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, [field]: value } : i))
      );
    } catch {
      setError("Failed to update item");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--gold)]" />
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="mb-6 flex items-center gap-4 border-b border-[var(--border)]">
        <button
          onClick={() => setTab("categories")}
          className={`border-b-2 px-4 py-3 text-sm font-medium transition ${
            tab === "categories"
              ? "border-[var(--gold)] text-[var(--gold-bright)]"
              : "border-transparent text-[var(--text-dim)] hover:text-[var(--text-muted)]"
          }`}
        >
          <Tag className="mr-2 inline h-4 w-4" />
          Categories
        </button>
        <button
          onClick={() => setTab("items")}
          className={`border-b-2 px-4 py-3 text-sm font-medium transition ${
            tab === "items"
              ? "border-[var(--gold)] text-[var(--gold-bright)]"
              : "border-transparent text-[var(--text-dim)] hover:text-[var(--text-muted)]"
          }`}
        >
          <Zap className="mr-2 inline h-4 w-4" />
          Menu Items
        </button>
      </div>

      {tab === "categories" && (
        <div className="space-y-6">
          <form onSubmit={handleCreateCategory} className="flex items-end gap-3">
            <label className="flex-1 text-sm">
              <span className="mb-1 block text-[#aaa]">Category Name</span>
              <input
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="e.g. Starters"
                className={inputClass}
                required
              />
            </label>
            <label className="w-24 text-sm">
              <span className="mb-1 block text-[#aaa]">Order</span>
              <input
                type="number"
                value={newCatSort}
                onChange={(e) => setNewCatSort(parseInt(e.target.value) || 0)}
                className={inputClass}
              />
            </label>
            <button type="submit" disabled={creatingCat || !newCatName.trim()} className={btnGold}>
              {creatingCat ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </button>
          </form>

          <div className="space-y-2">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3"
              >
                <GripVertical className="h-4 w-4 text-[#666]" />
                {editingCatId === cat.id ? (
                  <>
                    <input
                      value={editCatName}
                      onChange={(e) => setEditCatName(e.target.value)}
                      className={`${inputClass} flex-1`}
                      autoFocus
                    />
                    <input
                      type="number"
                      value={editCatSort}
                      onChange={(e) => setEditCatSort(parseInt(e.target.value) || 0)}
                      className={`${inputClass} w-20`}
                    />
                    <button
                      onClick={() => saveEditCat(cat.id)}
                      disabled={savingCatId === cat.id}
                      className={btnGold}
                    >
                      {savingCatId === cat.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    </button>
                    <button onClick={() => setEditingCatId(null)} className={btnOutline}>
                      <X className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm font-medium text-white">{cat.name}</span>
                    <span className="rounded-full bg-[var(--gold)]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[var(--gold-bright)]">
                      {cat.itemCount} items
                    </span>
                    <span className="text-xs text-[#666]">#{cat.sortOrder}</span>
                    <button onClick={() => startEditCat(cat)} className={btnOutline}>
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteCategory(cat.id)}
                      disabled={deletingCatId === cat.id}
                      className={btnDanger}
                    >
                      {deletingCatId === cat.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </button>
                  </>
                )}
              </div>
            ))}
            {categories.length === 0 && (
              <p className="py-8 text-center text-sm text-[#666]">No categories yet. Add one above.</p>
            )}
          </div>
        </div>
      )}

      {tab === "items" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[var(--text-dim)]">{items.length} items</p>
            <button onClick={openAddItemModal} className={btnGold}>
              <Plus className="mr-1 inline h-4 w-4" />
              Add Item
            </button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--bg-elevated)]">
                  <th className="px-4 py-3 font-medium text-[#aaa]">Item</th>
                  <th className="px-4 py-3 font-medium text-[#aaa]">Category</th>
                  <th className="px-4 py-3 font-medium text-[#aaa]">Price</th>
                  <th className="px-4 py-3 font-medium text-[#aaa]">Available</th>
                  <th className="px-4 py-3 font-medium text-[#aaa]">Featured</th>
                  <th className="px-4 py-3 font-medium text-[#aaa]">Popular</th>
                  <th className="px-4 py-3 font-medium text-[#aaa]">Special</th>
                  <th className="px-4 py-3 font-medium text-[#aaa]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-[#1a1a1a] transition hover:bg-[#0e0e0e]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)]">
                          {item.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full items-center justify-center text-[#666]">
                              <ImagePlus className="h-4 w-4" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-white">{item.name}</p>
                          {item.description && (
                            <p className="max-w-[200px] truncate text-xs text-[#666]">{item.description}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[var(--text-muted)]">{item.category.name}</td>
                    <td className="px-4 py-3 font-medium text-[var(--gold-bright)]">
                      Rs. {new Intl.NumberFormat("en-PK").format(Math.round(item.price))}
                    </td>
                    <td className="px-4 py-3">
                      <Toggle checked={item.available} onChange={(v) => toggleItemField(item.id, "available", v)} />
                    </td>
                    <td className="px-4 py-3">
                      <Toggle checked={item.featured} onChange={(v) => toggleItemField(item.id, "featured", v)} />
                    </td>
                    <td className="px-4 py-3">
                      <Toggle checked={item.popular} onChange={(v) => toggleItemField(item.id, "popular", v)} />
                    </td>
                    <td className="px-4 py-3">
                      <Toggle checked={item.todaySpecial} onChange={(v) => toggleItemField(item.id, "todaySpecial", v)} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEditItemModal(item)} className={btnOutline}>
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteItem(item.id)}
                          disabled={deletingItemId === item.id}
                          className={btnDanger}
                        >
                          {deletingItemId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-sm text-[#666]">
                      No menu items yet. Add your first item.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showItemModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/75 pt-10 pb-10">
          <button className="fixed inset-0" aria-label="Close" onClick={() => setShowItemModal(false)} />
          <div className="relative z-10 w-full max-w-lg rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
              <h2 className="font-display text-lg text-[var(--gold-bright)]">
                {editingItem ? "Edit Item" : "Add Item"}
              </h2>
              <button onClick={() => setShowItemModal(false)} className="text-[var(--text-dim)] hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="max-h-[70vh] overflow-y-auto px-6 py-5 space-y-4">
              <label className="block text-sm">
                <span className="mb-1 block text-[#aaa]">Name *</span>
                <input
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  required
                  placeholder="e.g. Chicken Karahi"
                  className={inputClass}
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block text-[#aaa]">Description</span>
                <textarea
                  value={itemDesc}
                  onChange={(e) => setItemDesc(e.target.value)}
                  rows={2}
                  placeholder="Brief description..."
                  className={`${inputClass} resize-none`}
                />
              </label>

              <div className="grid grid-cols-2 gap-4">
                <label className="block text-sm">
                  <span className="mb-1 block text-[#aaa]">Price (Rs.) *</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={itemPrice}
                    onChange={(e) => setItemPrice(e.target.value)}
                    required
                    placeholder="0"
                    className={inputClass}
                  />
                </label>

                <label className="block text-sm">
                  <span className="mb-1 block text-[#aaa]">Category *</span>
                  <div className="relative">
                    <select
                      value={itemCategoryId}
                      onChange={(e) => setItemCategoryId(e.target.value)}
                      required
                      className={`${inputClass} appearance-none pr-8`}
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#666]" />
                  </div>
                </label>
              </div>

              <div className="text-sm">
                <span className="mb-1 block text-[#aaa]">Image</span>
                <div className="flex items-center gap-3">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)]">
                    {itemImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={itemImageUrl} alt="Preview" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[#666]">
                        <ImagePlus className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <input
                      value={itemImageUrl}
                      onChange={(e) => setItemImageUrl(e.target.value)}
                      placeholder="/uploads/menu/..."
                      className={inputClass}
                    />
                    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-xs text-[var(--text-dim)] transition hover:border-[var(--gold)]/50 hover:text-[var(--gold-bright)]">
                      <Upload className="h-3.5 w-3.5" />
                      {uploadingImage ? "Uploading..." : "Upload file"}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                        disabled={uploadingImage}
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                <ToggleOption label="Available" checked={itemAvailable} onChange={setItemAvailable} />
                <ToggleOption label="Featured" checked={itemFeatured} onChange={setItemFeatured} />
                <ToggleOption label="Popular" checked={itemPopular} onChange={setItemPopular} />
                <ToggleOption label="Today's Special" checked={itemTodaySpecial} onChange={setItemTodaySpecial} />
              </div>

              <div className="space-y-3">
                <span className="block text-sm text-[#aaa]">Variants</span>
                {itemVariants.map((v, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      value={v.name}
                      onChange={(e) => {
                        const next = [...itemVariants];
                        next[i] = { ...next[i], name: e.target.value };
                        setItemVariants(next);
                      }}
                      placeholder="Variant name"
                      className={`${inputClass} flex-1`}
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={v.priceAdj}
                      onChange={(e) => {
                        const next = [...itemVariants];
                        next[i] = { ...next[i], priceAdj: parseFloat(e.target.value) || 0 };
                        setItemVariants(next);
                      }}
                      placeholder="Price adj."
                      className={`${inputClass} w-24`}
                    />
                    <button
                      type="button"
                      onClick={() => setItemVariants(itemVariants.filter((_, j) => j !== i))}
                      className="text-red-400 hover:text-red-300"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setItemVariants([...itemVariants, { name: "", priceAdj: 0 }])}
                  className="text-xs text-[var(--gold)] hover:text-[var(--gold-bright)]"
                >
                  + Add Variant
                </button>
              </div>

              <div className="space-y-3">
                <span className="block text-sm text-[#aaa]">Add-ons</span>
                {itemAddOns.map((a, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      value={a.name}
                      onChange={(e) => {
                        const next = [...itemAddOns];
                        next[i] = { ...next[i], name: e.target.value };
                        setItemAddOns(next);
                      }}
                      placeholder="Add-on name"
                      className={`${inputClass} flex-1`}
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={a.price}
                      onChange={(e) => {
                        const next = [...itemAddOns];
                        next[i] = { ...next[i], price: parseFloat(e.target.value) || 0 };
                        setItemAddOns(next);
                      }}
                      placeholder="Price"
                      className={`${inputClass} w-24`}
                    />
                    <button
                      type="button"
                      onClick={() => setItemAddOns(itemAddOns.filter((_, j) => j !== i))}
                      className="text-red-400 hover:text-red-300"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setItemAddOns([...itemAddOns, { name: "", price: 0 }])}
                  className="text-xs text-[var(--gold)] hover:text-[var(--gold-bright)]"
                >
                  + Add Add-on
                </button>
              </div>

              <label className="block text-sm">
                <span className="mb-1 block text-[#aaa]">Special Instructions</span>
                <textarea
                  value={itemSpecialInstr}
                  onChange={(e) => setItemSpecialInstr(e.target.value)}
                  rows={2}
                  placeholder="Default special instructions..."
                  className={`${inputClass} resize-none`}
                />
              </label>

              <div className="flex items-center gap-3 border-t border-[var(--border)] pt-4">
                <button type="submit" disabled={savingItem || !itemName.trim() || !itemPrice || !itemCategoryId} className={btnGold}>
                  {savingItem ? <Loader2 className="mr-1 inline h-4 w-4 animate-spin" /> : <Check className="mr-1 inline h-4 w-4" />}
                  {editingItem ? "Save Changes" : "Create Item"}
                </button>
                <button type="button" onClick={() => setShowItemModal(false)} className={btnOutline}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 rounded-full transition ${checked ? "bg-[var(--gold)]" : "bg-[var(--border-strong)]"}`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${checked ? "left-[18px]" : "left-0.5"}`}
      />
    </button>
  );
}

function ToggleOption({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--text-muted)]">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 shrink-0 rounded-full transition ${checked ? "bg-[var(--gold)]" : "bg-[var(--border-strong)]"}`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${checked ? "left-[18px]" : "left-0.5"}`}
        />
      </button>
      {label}
    </label>
  );
}
