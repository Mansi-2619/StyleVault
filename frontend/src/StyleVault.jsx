import { useState, useRef } from "react";

const INITIAL_ITEMS = [
  { id: 1, emoji: "👕", name: "white linen shirt", color: "crisp white", cat: "tops", style: "minimal", tags: ["linen", "white", "minimal", "casual"], image: null },
  { id: 2, emoji: "🎀", name: "pink ruffle top", color: "dusty rose", cat: "tops", style: "feminine", tags: ["pink", "ruffle", "feminine", "romantic"], image: null },
  { id: 3, emoji: "🖤", name: "black crop top", color: "solid black", cat: "tops", style: "edgy", tags: ["black", "crop", "edgy", "casual"], image: null },
  { id: 4, emoji: "🌸", name: "floral blouse", color: "white floral", cat: "tops", style: "romantic", tags: ["floral", "white", "romantic", "feminine"], image: null },
  { id: 5, emoji: "👖", name: "blue wide-leg jeans", color: "mid wash blue", cat: "bottoms", style: "casual", tags: ["blue", "denim", "wide-leg", "casual"], image: null },
  { id: 6, emoji: "🖤", name: "black tailored trousers", color: "solid black", cat: "bottoms", style: "formal", tags: ["black", "formal", "tailored", "office"], image: null },
  { id: 7, emoji: "🪷", name: "floral midi skirt", color: "pink & white", cat: "bottoms", style: "romantic", tags: ["floral", "pink", "midi", "skirt", "romantic"], image: null },
  { id: 8, emoji: "👗", name: "beige slip dress", color: "warm beige", cat: "dresses", style: "elegant", tags: ["beige", "slip", "elegant", "minimal"], image: null },
  { id: 9, emoji: "🌺", name: "red floral sundress", color: "red floral", cat: "dresses", style: "feminine", tags: ["red", "floral", "sundress", "bold"], image: null },
  { id: 10, emoji: "👟", name: "white sneakers", color: "clean white", cat: "footwear", style: "casual", tags: ["white", "sneakers", "casual", "sporty"], image: null },
  { id: 11, emoji: "👠", name: "nude heels", color: "nude/beige", cat: "footwear", style: "classic", tags: ["nude", "heels", "classic", "elegant"], image: null },
  { id: 12, emoji: "💍", name: "gold layered necklace", color: "gold", cat: "accessories", style: "minimal", tags: ["gold", "necklace", "layered", "minimal"], image: null },
];

const CATS = [
  { key: "all", label: "all items", icon: "✨" },
  { key: "tops", label: "tops", icon: "👕" },
  { key: "bottoms", label: "bottoms", icon: "👖" },
  { key: "dresses", label: "dresses", icon: "👗" },
  { key: "footwear", label: "footwear", icon: "👟" },
  { key: "accessories", label: "accessories", icon: "💍" },
  { key: "watches", label: "watches", icon: "⌚" },
  { key: "jewellery", label: "jewellery", icon: "💎" },
];

const OCCASIONS = ["casual", "date night", "office", "party", "festive", "gym"];

async function callClaude(systemPrompt, userMessage, imageBase64 = null, mediaType = "image/jpeg") {
  const content = imageBase64
    ? [
        { type: "image", source: { type: "base64", media_type: mediaType, data: imageBase64 } },
        { type: "text", text: userMessage },
      ]
    : userMessage;

  const response = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: "user", content }],
    }),
  });
  const data = await response.json();
  return data.content?.[0]?.text || "";
}

function outfitsAreSame(a, b) {
  if (!a || !b) return false;
  const idsA = [...a.pieces.map(p => p.id)].sort().join(",");
  const idsB = [...b.pieces.map(p => p.id)].sort().join(",");
  return idsA === idsB;
}

export default function StyleVault() {
  const [tab, setTab] = useState("wardrobe");
  const [items, setItems] = useState(INITIAL_ITEMS);
  const [cat, setCat] = useState("all");
  const [occasion, setOccasion] = useState("casual");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [outfitResult, setOutfitResult] = useState(null);
  const [outfitHistory, setOutfitHistory] = useState([]);
  const [repeatWarning, setRepeatWarning] = useState(false);
  const [savedOutfits, setSavedOutfits] = useState([]);
  const [matchItem, setMatchItem] = useState(null);
  const [matchResult, setMatchResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadPreview, setUploadPreview] = useState(null);
  const [addForm, setAddForm] = useState({ name: "", cat: "tops", color: "", notes: "" });
  const [notification, setNotification] = useState(null);
  const fileRef = useRef();

  const notify = (msg) => { setNotification(msg); setTimeout(() => setNotification(null), 3000); };

  const visibleItems = cat === "all" ? items : items.filter(i => i.cat === cat);
  const catCount = (c) => items.filter(i => i.cat === c).length;

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const mediaType = file.type === "image/png" ? "image/png"
      : file.type === "image/webp" ? "image/webp"
      : file.type === "image/gif" ? "image/gif"
      : "image/jpeg";
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target.result;
      const base64 = dataUrl.split(",")[1];
      setUploadPreview({ loading: true, base64, dataUrl });
      try {
        const raw = await callClaude(
          `You are a fashion AI that analyzes clothing photos. Detect ONLY clothing items that are CLEARLY and FULLY visible.
STRICT RULES:
- Only describe what you can actually see
- Do NOT guess items that are cut off or not in frame
- Do NOT include footwear or accessories unless clearly visible
- If only upper body is visible, only describe upper body items
Return ONLY a JSON object: { name, cat (tops/bottoms/dresses/footwear/accessories/watches/jewellery), color, tags (4-5 strings) }
No markdown, no explanation, just raw JSON.`,
          "Analyze ONLY what is clearly visible in this photo.",
          base64,
          mediaType
        );
        const clean = raw.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(clean);
        setUploadPreview({ loading: false, base64, dataUrl, ...parsed });
        setAddForm({ name: parsed.name || "", cat: parsed.cat || "tops", color: parsed.color || "", notes: "" });
      } catch {
        setUploadPreview({ loading: false, base64, dataUrl, name: "", cat: "tops", color: "", tags: [] });
        setAddForm({ name: "", cat: "tops", color: "", notes: "" });
      }
    };
    reader.readAsDataURL(file);
  };

  const addItem = () => {
    if (!addForm.name.trim()) { notify("please enter a name!"); return; }
    const emojis = { tops: "👕", bottoms: "👖", dresses: "👗", footwear: "👟", accessories: "💍", watches: "⌚", jewellery: "💎" };
    const newItem = {
      id: Date.now(),
      emoji: emojis[addForm.cat] || "🎀",
      name: addForm.name,
      color: addForm.color || "unknown",
      cat: addForm.cat,
      style: "custom",
      tags: uploadPreview?.tags || [addForm.cat, addForm.color],
      image: uploadPreview?.dataUrl || null,
    };
    setItems(prev => [...prev, newItem]);
    setUploadPreview(null);
    setAddForm({ name: "", cat: "tops", color: "", notes: "" });
    setTab("wardrobe");
    notify(`"${newItem.name}" added to wardrobe! ✨`);
  };

  const generateOutfit = async () => {
    setLoading(true);
    setOutfitResult(null);
    setRepeatWarning(false);
    const previousCombos = outfitHistory
      .filter(o => o.occasion === occasion)
      .map(o => o.pieces.map(p => p.id).sort().join(","));
    const wardrobe = items.map(i => `id:${i.id} | ${i.name} | ${i.color} | ${i.cat} | tags: ${i.tags?.join(", ")}`).join("\n");
    const excludeNote = previousCombos.length > 0
      ? `\n\nDo NOT repeat these combinations (by ids): ${previousCombos.join(" | ")}. Pick a FRESH combination.`
      : "";
    try {
      const raw = await callClaude(
        `You are a personal stylist AI for girls. Suggest creative outfits from a wardrobe. Return ONLY JSON: { pieces: [item ids as numbers], note: "fun style note with emojis" }. No markdown.`,
        `My wardrobe:\n${wardrobe}\n\nCreate the perfect ${occasion} outfit. Pick 3-4 pieces (at least 1 top or dress + 1 bottom or dress + optionally footwear/accessories).${excludeNote}`
      );
      const clean = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      const pieces = parsed.pieces.map(id => items.find(i => i.id === Number(id))).filter(Boolean);
      if (pieces.length < 2) throw new Error("too few pieces");
      const newOutfit = { pieces, note: parsed.note, occasion };
      const isRepeat = outfitHistory.some(prev => outfitsAreSame(prev, newOutfit));
      if (isRepeat) setRepeatWarning(true);
      setOutfitResult(newOutfit);
      if (!isRepeat) setOutfitHistory(prev => [...prev, newOutfit]);
    } catch {
      const fallbacks = {
        casual: { ids: [1, 5, 10], note: "white linen + wide-leg jeans + sneakers = effortless cool girl energy! 🤍👟" },
        "date night": { ids: [8, 11, 12], note: "beige slip dress + nude heels + gold necklace = understated luxury ✨💕" },
        office: { ids: [1, 6, 11], note: "white shirt + black trousers + nude heels = polished power outfit 💼" },
        party: { ids: [9, 11, 12], note: "red sundress + heels + gold necklace — you ARE the party 🌺🔥" },
        festive: { ids: [9, 11, 12], note: "go all out in red! festive, joyful, and totally unforgettable ✨🎉" },
        gym: { ids: [3, 5, 10], note: "crop top + wide-leg pants + sneakers = gym-to-brunch ready 💪" },
      };
      const fb = fallbacks[occasion] || fallbacks.casual;
      const pieces = fb.ids.map(id => items.find(i => i.id === id)).filter(Boolean);
      const fallbackOutfit = { pieces, note: fb.note, occasion };
      const isRepeat = outfitHistory.some(prev => outfitsAreSame(prev, fallbackOutfit));
      if (isRepeat) setRepeatWarning(true);
      setOutfitResult(fallbackOutfit);
      if (!isRepeat) setOutfitHistory(prev => [...prev, fallbackOutfit]);
    }
    setLoading(false);
  };

  const saveOutfit = () => {
    if (!outfitResult) return;
    if (savedOutfits.some(s => outfitsAreSame(s, outfitResult))) { notify("already saved! 💕"); return; }
    setSavedOutfits(prev => [...prev, { ...outfitResult, id: Date.now(), savedAt: new Date().toLocaleDateString() }]);
    notify("outfit saved! 💕");
  };

  const getMatches = async (item) => {
    setMatchItem(item);
    setMatchResult(null);
    setLoading(true);
    const wardrobe = items.filter(i => i.id !== item.id).map(i => `id:${i.id} | ${i.name} | ${i.color} | ${i.cat} | tags: ${i.tags?.join(", ")}`).join("\n");
    try {
      const raw = await callClaude(
        `You are a fashion stylist AI. Suggest items that pair best. Return ONLY JSON: { matches: [up to 4 item ids], tip: "style tip with emojis" }. Raw JSON only.`,
        `Item: ${item.name} (${item.color}, ${item.cat})\n\nWardrobe:\n${wardrobe}\n\nWhich items pair best?`
      );
      const clean = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      const matches = parsed.matches.map(id => items.find(i => i.id === Number(id))).filter(Boolean);
      setMatchResult({ matches, tip: parsed.tip });
    } catch {
      setMatchResult({ matches: items.filter(i => i.id !== item.id).slice(0, 4), tip: "these pieces work great together! ✨" });
    }
    setLoading(false);
  };

  const ItemDisplay = ({ item, fill = false, size = 72, fontSize = 28, borderRadius = 10 }) => (
    item.image
      ? <img src={item.image} alt={item.name} style={{ width: fill ? "100%" : size, height: fill ? "100%" : size, objectFit: "cover", borderRadius, display: "block" }} />
      : <div style={{ width: fill ? "100%" : size, height: fill ? "100%" : size, display: "flex", alignItems: "center", justifyContent: "center", fontSize, background: "#f0ece6", borderRadius }}>
          {item.emoji}
        </div>
  );

  const s = styles;

  return (
    <div style={s.app}>
      {notification && <div style={s.toast}>{notification}</div>}

      <div style={s.topbar}>
        <div style={s.logo}>Style<span style={{ color: "#F2C4CE", fontStyle: "italic" }}>Vault</span></div>
        <div style={s.nav}>
          {[["wardrobe","👗 wardrobe"],["outfits","💕 outfits"],["match","🔍 matcher"],["upload","+ add item"]].map(([t, label]) => (
            <button key={t} style={{ ...s.navBtn, ...(tab === t ? s.navBtnActive : {}) }} onClick={() => setTab(t)}>{label}</button>
          ))}
        </div>
      </div>

      <div style={s.main}>
        <div style={s.sidebar}>
          {CATS.map(c => (
            <button key={c.key} style={{ ...s.catBtn, ...(cat === c.key ? s.catBtnActive : {}) }}
              onClick={() => { setCat(c.key); setTab("wardrobe"); }}>
              <span style={s.catIcon}>{c.icon}</span>
              <span style={{ flex: 1, textAlign: "left" }}>{c.label}</span>
              <span style={s.catCount}>{c.key === "all" ? items.length : catCount(c.key)}</span>
            </button>
          ))}
          <div style={s.sidebarTip}>
            <p style={{ fontSize: 11, color: "#aaa", lineHeight: 1.6 }}>
              {tab === "wardrobe" ? "select items then tap 'suggest outfit' ✨" :
               tab === "match" ? "tap any item to find its perfect matches 🔍" :
               "build your digital wardrobe, one piece at a time 💕"}
            </p>
          </div>
        </div>

        <div style={s.content}>

          {tab === "wardrobe" && (
            <>
              <div style={s.contentHeader}>
                <div style={s.contentTitle}>my wardrobe</div>
                <button style={s.addBtn} onClick={() => setTab("upload")}>+ add item</button>
              </div>
              {visibleItems.length === 0 ? (
                <p style={{ fontSize: 13, color: "#aaa", marginTop: 8 }}>no items yet. add some! 💕</p>
              ) : (
                <div style={s.grid}>
                  {visibleItems.map(item => (
                    <div key={item.id} style={{ ...s.clothCard, ...(selectedIds.has(item.id) ? s.clothCardSelected : {}) }}
                      onClick={() => toggleSelect(item.id)}>
                      <div style={{ width: "100%", aspectRatio: "1", overflow: "hidden" }}>
                        <ItemDisplay item={item} fill fontSize={34} borderRadius={0} />
                      </div>
                      <div style={s.clothInfo}>
                        <div style={s.clothName}>{item.name}</div>
                        <div style={s.clothColor}>{item.color}</div>
                      </div>
                      {selectedIds.has(item.id) && <div style={s.selectBadge}>✓</div>}
                    </div>
                  ))}
                </div>
              )}

              <div style={s.outfitPanel}>
                <div style={s.outfitPanelHeader}>
                  <div style={s.sectionTitle}>create an outfit</div>
                  <button style={s.genBtn} onClick={generateOutfit} disabled={loading}>
                    {loading ? "styling..." : "✨ suggest outfit"}
                  </button>
                </div>
                <div style={s.chips}>
                  {OCCASIONS.map(occ => (
                    <button key={occ} style={{ ...s.chip, ...(occasion === occ ? s.chipActive : {}) }}
                      onClick={() => setOccasion(occ)}>{occ}</button>
                  ))}
                </div>
                {repeatWarning && (
                  <div style={s.repeatWarning}>⚠️ This outfit was already suggested! Tap again for a fresh look.</div>
                )}
                {outfitResult && (
                  <div style={s.outfitResult}>
                    <div style={s.outfitRow}>
                      {outfitResult.pieces.map((p, i) => (
                        <span key={p.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {i > 0 && <span style={{ color: "#ccc", fontSize: 18 }}>+</span>}
                          <div style={s.outfitPiece}>
                            <div style={{ width: 72, height: 72, borderRadius: 10, overflow: "hidden" }}>
                              <ItemDisplay item={p} size={72} fontSize={28} borderRadius={10} />
                            </div>
                            <p style={{ fontSize: 10, color: "#888", marginTop: 4, textAlign: "center", maxWidth: 72 }}>{p.name}</p>
                          </div>
                        </span>
                      ))}
                    </div>
                    <div style={s.aiNote}>{outfitResult.note}</div>
                    <button style={s.saveBtn} onClick={saveOutfit}>save outfit 💕</button>
                  </div>
                )}
              </div>
            </>
          )}

          {tab === "outfits" && (
            <>
              <div style={s.contentHeader}>
                <div style={s.contentTitle}>saved outfits</div>
              </div>
              {savedOutfits.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0" }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>👗</div>
                  <p style={{ fontSize: 14, color: "#aaa" }}>no saved outfits yet!</p>
                  <p style={{ fontSize: 12, color: "#bbb", marginTop: 4 }}>wardrobe → suggest outfit → save 💕</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {savedOutfits.map(outfit => (
                    <div key={outfit.id} style={s.savedOutfitCard}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                        <span style={s.occasionBadge}>{outfit.occasion}</span>
                        <span style={{ fontSize: 11, color: "#aaa" }}>saved {outfit.savedAt}</span>
                      </div>
                      <div style={s.outfitRow}>
                        {outfit.pieces.map((p, i) => (
                          <span key={p.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            {i > 0 && <span style={{ color: "#ccc" }}>+</span>}
                            <div style={s.outfitPiece}>
                              <div style={{ width: 64, height: 64, borderRadius: 10, overflow: "hidden" }}>
                                <ItemDisplay item={p} size={64} fontSize={26} borderRadius={10} />
                              </div>
                              <p style={{ fontSize: 10, color: "#888", marginTop: 4, textAlign: "center", maxWidth: 64 }}>{p.name}</p>
                            </div>
                          </span>
                        ))}
                      </div>
                      <div style={{ ...s.aiNote, marginTop: 10 }}>{outfit.note}</div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {tab === "match" && (
            <>
              <div style={s.contentHeader}>
                <div style={s.contentTitle}>what goes with this?</div>
              </div>
              <p style={{ fontSize: 13, color: "#888", marginBottom: 16 }}>tap any item to find its best matches</p>
              <div style={s.grid}>
                {items.map(item => (
                  <div key={item.id} style={{ ...s.clothCard, ...(matchItem?.id === item.id ? s.clothCardSelected : {}) }}
                    onClick={() => getMatches(item)}>
                    <div style={{ width: "100%", aspectRatio: "1", overflow: "hidden" }}>
                      <ItemDisplay item={item} fill fontSize={34} borderRadius={0} />
                    </div>
                    <div style={s.clothInfo}>
                      <div style={s.clothName}>{item.name}</div>
                      <div style={s.clothColor}>{item.color}</div>
                    </div>
                  </div>
                ))}
              </div>
              {loading && <div style={s.loadingBar}>✨ finding matches...</div>}
              {matchResult && matchItem && (
                <div style={s.outfitPanel}>
                  <div style={s.sectionTitle}>pairs well with "{matchItem.name}"</div>
                  <div style={{ ...s.outfitRow, marginTop: 12, flexWrap: "wrap" }}>
                    {matchResult.matches.map(p => (
                      <div key={p.id} style={s.outfitPiece}>
                        <div style={{ width: 72, height: 72, borderRadius: 10, overflow: "hidden" }}>
                          <ItemDisplay item={p} size={72} fontSize={28} borderRadius={10} />
                        </div>
                        <p style={{ fontSize: 10, color: "#888", marginTop: 4, textAlign: "center", maxWidth: 72 }}>{p.name}</p>
                      </div>
                    ))}
                  </div>
                  <div style={s.aiNote}>{matchResult.tip}</div>
                </div>
              )}
            </>
          )}

          {tab === "upload" && (
            <>
              <div style={s.contentHeader}>
                <div style={s.contentTitle}>add new item</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                <div>
                  {!uploadPreview ? (
                    <div style={s.uploadArea} onClick={() => fileRef.current?.click()}>
                      <div style={{ fontSize: 40 }}>📸</div>
                      <p style={{ fontSize: 14, color: "#888", marginTop: 8 }}>tap to upload photo</p>
                      <p style={{ fontSize: 11, color: "#bbb", marginTop: 4 }}>AI detects only what's visible</p>
                      <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileUpload} />
                    </div>
                  ) : (
                    <div style={s.previewCard}>
                      {uploadPreview.loading ? (
                        <div style={{ textAlign: "center", padding: "40px 0" }}>
                          <div style={{ fontSize: 40 }}>🔍</div>
                          <p style={{ fontSize: 13, color: "#888", marginTop: 8 }}>analyzing your item...</p>
                        </div>
                      ) : (
                        <>
                          <div style={{ height: 180, overflow: "hidden", borderRadius: "14px 14px 0 0" }}>
                            <img src={uploadPreview.dataUrl} alt="uploaded item"
                              style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          </div>
                          <div style={{ padding: 12 }}>
                            <p style={{ fontSize: 11, color: "#aaa", marginBottom: 6 }}>AI detected:</p>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                              {(uploadPreview.tags || []).map(t => (
                                <span key={t} style={s.tag}>{t}</span>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                      <button style={{ ...s.demoBtn, margin: "8px 12px 12px" }}
                        onClick={() => { setUploadPreview(null); if (fileRef.current) fileRef.current.value = ""; }}>
                        try another
                      </button>
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {[
                    { label: "item name", key: "name", placeholder: "e.g. floral midi dress" },
                    { label: "color / style notes", key: "color", placeholder: "e.g. dusty rose, floral print" },
                  ].map(({ label, key, placeholder }) => (
                    <div key={key}>
                      <label style={s.inputLabel}>{label}</label>
                      <input placeholder={placeholder} value={addForm[key]}
                        onChange={e => setAddForm(prev => ({ ...prev, [key]: e.target.value }))}
                        style={s.input} />
                    </div>
                  ))}
                  <div>
                    <label style={s.inputLabel}>category</label>
                    <select value={addForm.cat} onChange={e => setAddForm(prev => ({ ...prev, cat: e.target.value }))} style={s.input}>
                      {["tops","bottoms","dresses","footwear","accessories","watches","jewellery"].map(c => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <button style={s.confirmAddBtn} onClick={addItem}>add to wardrobe ✨</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  app: { fontFamily: "'DM Sans', 'Segoe UI', sans-serif", background: "#FAF7F2", borderRadius: 16, overflow: "hidden", border: "0.5px solid #e0ddd8", minHeight: 640, position: "relative" },
  toast: { position: "absolute", top: 16, right: 16, background: "#1C1C1E", color: "#F2C4CE", padding: "10px 18px", borderRadius: 20, fontSize: 13, zIndex: 100, boxShadow: "0 4px 20px rgba(0,0,0,0.3)" },
  topbar: { background: "#1C1C1E", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 },
  logo: { fontFamily: "Georgia, serif", color: "#fff", fontSize: 22, letterSpacing: "0.02em" },
  nav: { display: "flex", gap: 4, flexWrap: "wrap" },
  navBtn: { background: "none", border: "none", color: "#888", fontSize: 12, fontFamily: "inherit", padding: "6px 12px", borderRadius: 20, cursor: "pointer" },
  navBtnActive: { background: "rgba(255,255,255,0.12)", color: "#fff" },
  main: { display: "grid", gridTemplateColumns: "200px 1fr", minHeight: 580 },
  sidebar: { background: "#1C1C1E", padding: 12, display: "flex", flexDirection: "column", gap: 4 },
  catBtn: { display: "flex", alignItems: "center", gap: 8, padding: "9px 10px", borderRadius: 10, border: "none", background: "none", color: "#888", fontFamily: "inherit", fontSize: 12, cursor: "pointer", width: "100%", textAlign: "left" },
  catBtnActive: { background: "rgba(242,196,206,0.12)", color: "#F2C4CE" },
  catIcon: { width: 28, height: 28, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, background: "rgba(255,255,255,0.06)", flexShrink: 0 },
  catCount: { marginLeft: "auto", fontSize: 10, background: "rgba(255,255,255,0.08)", padding: "2px 7px", borderRadius: 10, color: "#888" },
  sidebarTip: { marginTop: "auto", padding: 10, background: "rgba(242,196,206,0.06)", borderRadius: 10 },
  content: { padding: 20, background: "#FAF7F2", overflowY: "auto" },
  contentHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  contentTitle: { fontFamily: "Georgia, serif", fontSize: 22, color: "#1C1C1E" },
  addBtn: { background: "#1C1C1E", color: "#F2C4CE", border: "none", padding: "8px 16px", borderRadius: 20, fontFamily: "inherit", fontSize: 12, cursor: "pointer" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 10 },
  clothCard: { background: "#fff", borderRadius: 12, overflow: "hidden", border: "0.5px solid #e0ddd8", cursor: "pointer", position: "relative" },
  clothCardSelected: { border: "2px solid #C97A8E", boxShadow: "0 0 0 3px rgba(201,122,142,0.12)" },
  clothInfo: { padding: "7px 8px" },
  clothName: { fontSize: 11, fontWeight: 500, color: "#1C1C1E", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  clothColor: { fontSize: 10, color: "#8A8A8E", marginTop: 2 },
  selectBadge: { position: "absolute", top: 6, right: 6, width: 18, height: 18, borderRadius: "50%", background: "#C97A8E", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 9 },
  outfitPanel: { background: "#fff", borderRadius: 14, border: "0.5px solid #e0ddd8", padding: 18, marginTop: 18 },
  outfitPanelHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  sectionTitle: { fontFamily: "Georgia, serif", fontSize: 17, color: "#1C1C1E" },
  genBtn: { background: "linear-gradient(135deg,#C97A8E,#E8A4B5)", color: "#fff", border: "none", padding: "9px 18px", borderRadius: 20, fontFamily: "inherit", fontSize: 12, cursor: "pointer", fontWeight: 500 },
  chips: { display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 14 },
  chip: { padding: "5px 13px", borderRadius: 20, border: "0.5px solid #e0ddd8", fontSize: 12, cursor: "pointer", background: "none", fontFamily: "inherit", color: "#8A8A8E" },
  chipActive: { background: "#1C1C1E", color: "#F2C4CE", borderColor: "#1C1C1E" },
  repeatWarning: { background: "#fff8e1", border: "1px solid #f5c842", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#7a6200", marginBottom: 12 },
  outfitResult: {},
  outfitRow: { display: "flex", alignItems: "flex-start", gap: 8, flexWrap: "wrap" },
  outfitPiece: { display: "flex", flexDirection: "column", alignItems: "center" },
  aiNote: { marginTop: 14, background: "#faf3f5", borderLeft: "3px solid #C97A8E", borderRadius: "0 8px 8px 0", padding: "10px 14px", fontSize: 13, color: "#7a4a55", lineHeight: 1.6 },
  saveBtn: { marginTop: 12, background: "none", border: "0.5px solid #C97A8E", color: "#C97A8E", padding: "7px 16px", borderRadius: 20, fontFamily: "inherit", fontSize: 12, cursor: "pointer" },
  savedOutfitCard: { background: "#fff", borderRadius: 14, border: "0.5px solid #e0ddd8", padding: 16 },
  occasionBadge: { background: "rgba(201,122,142,0.1)", color: "#C97A8E", fontSize: 11, padding: "3px 10px", borderRadius: 10 },
  loadingBar: { marginTop: 16, padding: 14, background: "#faf3f5", borderRadius: 10, fontSize: 13, color: "#C97A8E", textAlign: "center" },
  uploadArea: { border: "1.5px dashed #C97A8E", borderRadius: 14, padding: 30, textAlign: "center", cursor: "pointer", background: "rgba(201,122,142,0.02)", display: "flex", flexDirection: "column", alignItems: "center" },
  previewCard: { background: "#fff", borderRadius: 14, border: "0.5px solid #e0ddd8", overflow: "hidden" },
  demoBtn: { marginTop: 12, background: "none", border: "0.5px solid #e0ddd8", color: "#888", padding: "6px 14px", borderRadius: 20, fontFamily: "inherit", fontSize: 11, cursor: "pointer" },
  inputLabel: { fontSize: 12, color: "#8A8A8E", display: "block", marginBottom: 5 },
  input: { width: "100%", padding: "9px 12px", border: "0.5px solid #e0ddd8", borderRadius: 9, fontFamily: "inherit", fontSize: 13, background: "#fff", color: "#1C1C1E", outline: "none", boxSizing: "border-box" },
  confirmAddBtn: { background: "#1C1C1E", color: "#F2C4CE", border: "none", padding: 11, borderRadius: 10, fontFamily: "inherit", fontSize: 13, cursor: "pointer", marginTop: "auto" },
  tag: { fontSize: 10, padding: "3px 9px", borderRadius: 10, background: "rgba(201,122,142,0.1)", color: "#C97A8E" },
};
