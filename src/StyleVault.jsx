import { useState, useRef, useCallback, useEffect } from "react";

const INITIAL_ITEMS = [
  { id: 1, emoji: "👕", name: "white linen shirt", color: "crisp white", cat: "tops", style: "minimal", tags: ["linen", "white", "minimal", "casual"] },
  { id: 2, emoji: "🎀", name: "pink ruffle top", color: "dusty rose", cat: "tops", style: "feminine", tags: ["pink", "ruffle", "feminine", "romantic"] },
  { id: 3, emoji: "🖤", name: "black crop top", color: "solid black", cat: "tops", style: "edgy", tags: ["black", "crop", "edgy", "casual"] },
  { id: 4, emoji: "🌸", name: "floral blouse", color: "white floral", cat: "tops", style: "romantic", tags: ["floral", "white", "romantic", "feminine"] },
  { id: 5, emoji: "👖", name: "blue wide-leg jeans", color: "mid wash blue", cat: "bottoms", style: "casual", tags: ["blue", "denim", "wide-leg", "casual"] },
  { id: 6, emoji: "🖤", name: "black tailored trousers", color: "solid black", cat: "bottoms", style: "formal", tags: ["black", "formal", "tailored", "office"] },
  { id: 7, emoji: "🪷", name: "floral midi skirt", color: "pink & white", cat: "bottoms", style: "romantic", tags: ["floral", "pink", "midi", "skirt", "romantic"] },
  { id: 8, emoji: "👗", name: "beige slip dress", color: "warm beige", cat: "dresses", style: "elegant", tags: ["beige", "slip", "elegant", "minimal"] },
  { id: 9, emoji: "🌺", name: "red floral sundress", color: "red floral", cat: "dresses", style: "feminine", tags: ["red", "floral", "sundress", "bold"] },
  { id: 10, emoji: "👟", name: "white sneakers", color: "clean white", cat: "footwear", style: "casual", tags: ["white", "sneakers", "casual", "sporty"] },
  { id: 11, emoji: "👠", name: "nude heels", color: "nude/beige", cat: "footwear", style: "classic", tags: ["nude", "heels", "classic", "elegant"] },
  { id: 12, emoji: "💍", name: "gold layered necklace", color: "gold", cat: "accessories", style: "minimal", tags: ["gold", "necklace", "layered", "minimal"] },
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

const UPLOAD_SAMPLES = [
  { emoji: "🌷", name: "pastel lilac co-ord set", cat: "tops", color: "lilac", tags: ["lilac", "co-ord", "pastel", "trendy"] },
  { emoji: "🩱", name: "white broderie top", cat: "tops", color: "white", tags: ["white", "broderie", "summer", "feminine"] },
  { emoji: "🩴", name: "brown kolhapuri sandals", cat: "footwear", color: "tan brown", tags: ["brown", "ethnic", "kolhapuri", "flat"] },
  { emoji: "⌚", name: "rose gold watch", cat: "watches", color: "rose gold", tags: ["rose gold", "watch", "elegant", "accessory"] },
  { emoji: "💎", name: "pearl drop earrings", cat: "jewellery", color: "white pearl", tags: ["pearl", "earrings", "elegant", "formal"] },
];

async function callClaude(systemPrompt, userMessage, imageBase64 = null) {
  const content = imageBase64
    ? [
        { type: "image", source: { type: "base64", media_type: "image/jpeg", data: imageBase64 } },
        { type: "text", text: userMessage },
      ]
    : userMessage;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
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

export default function StyleVault() {
  const [tab, setTab] = useState("wardrobe");
  const [items, setItems] = useState(INITIAL_ITEMS);
  const [cat, setCat] = useState("all");
  const [occasion, setOccasion] = useState("casual");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [outfitResult, setOutfitResult] = useState(null);
  const [savedOutfits, setSavedOutfits] = useState([]);
  const [matchItem, setMatchItem] = useState(null);
  const [matchResult, setMatchResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadPreview, setUploadPreview] = useState(null);
  const [uploadSampleIdx, setUploadSampleIdx] = useState(0);
  const [addForm, setAddForm] = useState({ name: "", cat: "tops", color: "", notes: "" });
  const [notification, setNotification] = useState(null);
  const fileRef = useRef();

  const notify = (msg) => { setNotification(msg); setTimeout(() => setNotification(null), 2500); };

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
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target.result.split(",")[1];
      setUploadPreview({ loading: true, emoji: "📸", base64 });
      try {
        const raw = await callClaude(
          `You are a fashion AI. Analyze the clothing item in the photo and return ONLY a JSON object with keys: name (string, short descriptive name), cat (one of: tops/bottoms/dresses/footwear/accessories/watches/jewellery), color (string), tags (array of 4-5 strings). No markdown, no explanation, just raw JSON.`,
          "Analyze this clothing item.",
          base64
        );
        const clean = raw.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(clean);
        setUploadPreview({ loading: false, base64, ...parsed, emoji: UPLOAD_SAMPLES[0].emoji });
        setAddForm({ name: parsed.name || "", cat: parsed.cat || "tops", color: parsed.color || "", notes: "" });
      } catch {
        const sample = UPLOAD_SAMPLES[uploadSampleIdx % UPLOAD_SAMPLES.length];
        setUploadPreview({ loading: false, ...sample, base64: null });
        setAddForm({ name: sample.name, cat: sample.cat, color: sample.color, notes: "" });
        setUploadSampleIdx(i => i + 1);
      }
    };
    reader.readAsDataURL(file);
  };

  const simulateUpload = () => {
    const sample = UPLOAD_SAMPLES[uploadSampleIdx % UPLOAD_SAMPLES.length];
    setUploadPreview({ loading: false, ...sample, base64: null });
    setAddForm({ name: sample.name, cat: sample.cat, color: sample.color, notes: "" });
    setUploadSampleIdx(i => i + 1);
  };

  const addItem = () => {
    if (!addForm.name.trim()) { notify("please enter a name!"); return; }
    const emojis = { tops: "👕", bottoms: "👖", dresses: "👗", footwear: "👟", accessories: "💍", watches: "⌚", jewellery: "💎" };
    const newItem = {
      id: Date.now(),
      emoji: uploadPreview?.emoji || emojis[addForm.cat] || "🎀",
      name: addForm.name,
      color: addForm.color || "unknown",
      cat: addForm.cat,
      style: "custom",
      tags: uploadPreview?.tags || [addForm.cat, addForm.color],
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
    const wardrobe = items.map(i => `id:${i.id} | ${i.name} | ${i.color} | ${i.cat} | tags: ${i.tags?.join(", ")}`).join("\n");
    try {
      const raw = await callClaude(
        `You are a personal stylist AI for girls. You suggest creative outfits from a given wardrobe. Return ONLY JSON with keys: pieces (array of item ids as numbers), note (a fun, enthusiastic 1-2 sentence style note with emojis). No markdown, just raw JSON.`,
        `My wardrobe:\n${wardrobe}\n\nCreate the perfect ${occasion} outfit. Pick 3-4 pieces that go together (at least 1 top or dress + 1 bottom or dress + optionally footwear/accessories). Return JSON.`
      );
      const clean = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      const pieces = parsed.pieces.map(id => items.find(i => i.id === Number(id))).filter(Boolean);
      if (pieces.length < 2) throw new Error("too few pieces");
      setOutfitResult({ pieces, note: parsed.note, occasion });
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
      setOutfitResult({ pieces, note: fb.note, occasion });
    }
    setLoading(false);
  };

  const saveOutfit = () => {
    if (!outfitResult) return;
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
        `You are a fashion stylist AI. Given a clothing item and a wardrobe, suggest which items pair best. Return ONLY JSON with keys: matches (array of up to 4 item ids as numbers), tip (short style tip with emojis). Raw JSON only.`,
        `The item: ${item.name} (${item.color}, ${item.cat})\n\nWardrobe:\n${wardrobe}\n\nWhich items from the wardrobe pair best? Return JSON.`
      );
      const clean = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      const matches = parsed.matches.map(id => items.find(i => i.id === Number(id))).filter(Boolean);
      setMatchResult({ matches, tip: parsed.tip });
    } catch {
      const others = items.filter(i => i.id !== item.id).slice(0, 4);
      setMatchResult({ matches: others, tip: "these pieces work great together based on your wardrobe! ✨" });
    }
    setLoading(false);
  };

  const s = styles;

  return (
    <div style={s.app}>
      {notification && <div style={s.toast}>{notification}</div>}

      {/* Top bar */}
      <div style={s.topbar}>
        <div style={s.logo}>Style<span style={{ color: "#F2C4CE", fontStyle: "italic" }}>Vault</span></div>
        <div style={s.nav}>
          {[["wardrobe","👗 wardrobe"],["outfits","💕 outfits"],["match","🔍 matcher"],["upload","+ add item"]].map(([t, label]) => (
            <button key={t} style={{ ...s.navBtn, ...(tab === t ? s.navBtnActive : {}) }} onClick={() => setTab(t)}>{label}</button>
          ))}
        </div>
      </div>

      <div style={s.main}>
        {/* Sidebar */}
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

        {/* Content */}
        <div style={s.content}>

          {/* WARDROBE TAB */}
          {tab === "wardrobe" && (
            <>
              <div style={s.contentHeader}>
                <div style={s.contentTitle}>my wardrobe</div>
                <button style={s.addBtn} onClick={() => setTab("upload")}>+ add item</button>
              </div>
              {visibleItems.length === 0 ? (
                <p style={{ fontSize: 13, color: "#aaa", marginTop: 8 }}>no items in this category yet. add some! 💕</p>
              ) : (
                <div style={s.grid}>
                  {visibleItems.map(item => (
                    <div key={item.id} style={{ ...s.clothCard, ...(selectedIds.has(item.id) ? s.clothCardSelected : {}) }}
                      onClick={() => toggleSelect(item.id)}>
                      <div style={s.clothImg}>{item.emoji}</div>
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
                {outfitResult && (
                  <div style={s.outfitResult}>
                    <div style={s.outfitRow}>
                      {outfitResult.pieces.map((p, i) => (
                        <span key={p.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {i > 0 && <span style={{ color: "#ccc", fontSize: 18 }}>+</span>}
                          <div style={s.outfitPiece}>
                            <div style={{ ...s.clothImg, width: 72, height: 72, fontSize: 28, borderRadius: 10 }}>{p.emoji}</div>
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

          {/* SAVED OUTFITS TAB */}
          {tab === "outfits" && (
            <>
              <div style={s.contentHeader}>
                <div style={s.contentTitle}>saved outfits</div>
              </div>
              {savedOutfits.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0" }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>👗</div>
                  <p style={{ fontSize: 14, color: "#aaa" }}>no saved outfits yet!</p>
                  <p style={{ fontSize: 12, color: "#bbb", marginTop: 4 }}>go to wardrobe → suggest outfit → save 💕</p>
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
                              <div style={{ ...s.clothImg, width: 64, height: 64, fontSize: 26, borderRadius: 10 }}>{p.emoji}</div>
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

          {/* MATCHER TAB */}
          {tab === "match" && (
            <>
              <div style={s.contentHeader}>
                <div style={s.contentTitle}>what goes with this?</div>
              </div>
              <p style={{ fontSize: 13, color: "#888", marginBottom: 16 }}>tap any item and AI will find its best matches from your wardrobe</p>
              <div style={s.grid}>
                {items.map(item => (
                  <div key={item.id} style={{ ...s.clothCard, ...(matchItem?.id === item.id ? s.clothCardSelected : {}) }}
                    onClick={() => getMatches(item)}>
                    <div style={s.clothImg}>{item.emoji}</div>
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
                        <div style={{ ...s.clothImg, width: 72, height: 72, fontSize: 28, borderRadius: 10 }}>{p.emoji}</div>
                        <p style={{ fontSize: 10, color: "#888", marginTop: 4, textAlign: "center", maxWidth: 72 }}>{p.name}</p>
                      </div>
                    ))}
                  </div>
                  <div style={s.aiNote}>{matchResult.tip}</div>
                </div>
              )}
            </>
          )}

          {/* UPLOAD TAB */}
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
                      <p style={{ fontSize: 11, color: "#bbb", marginTop: 4 }}>AI will auto-detect color, category & style</p>
                      <button style={s.demoBtn} onClick={(e) => { e.stopPropagation(); simulateUpload(); }}>or try demo upload</button>
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
                          <div style={{ background: "#f0ece6", height: 140, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 56 }}>
                            {uploadPreview.emoji}
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
                      <button style={{ ...s.demoBtn, margin: "8px 12px 12px" }} onClick={() => setUploadPreview(null)}>try another</button>
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {[
                    { label: "item name", key: "name", type: "text", placeholder: "e.g. floral midi dress" },
                    { label: "color / style notes", key: "color", type: "text", placeholder: "e.g. dusty rose, floral print" },
                  ].map(({ label, key, type, placeholder }) => (
                    <div key={key}>
                      <label style={s.inputLabel}>{label}</label>
                      <input type={type} placeholder={placeholder} value={addForm[key]}
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
  navBtn: { background: "none", border: "none", color: "#888", fontSize: 12, fontFamily: "inherit", padding: "6px 12px", borderRadius: 20, cursor: "pointer", transition: "all 0.2s" },
  navBtnActive: { background: "rgba(255,255,255,0.12)", color: "#fff" },
  main: { display: "grid", gridTemplateColumns: "200px 1fr", minHeight: 580 },
  sidebar: { background: "#1C1C1E", padding: 12, display: "flex", flexDirection: "column", gap: 4 },
  catBtn: { display: "flex", alignItems: "center", gap: 8, padding: "9px 10px", borderRadius: 10, border: "none", background: "none", color: "#888", fontFamily: "inherit", fontSize: 12, cursor: "pointer", width: "100%", textAlign: "left", transition: "all 0.2s" },
  catBtnActive: { background: "rgba(242,196,206,0.12)", color: "#F2C4CE" },
  catIcon: { width: 28, height: 28, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, background: "rgba(255,255,255,0.06)", flexShrink: 0 },
  catCount: { marginLeft: "auto", fontSize: 10, background: "rgba(255,255,255,0.08)", padding: "2px 7px", borderRadius: 10, color: "#888" },
  sidebarTip: { marginTop: "auto", padding: 10, background: "rgba(242,196,206,0.06)", borderRadius: 10 },
  content: { padding: 20, background: "#FAF7F2", overflowY: "auto" },
  contentHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  contentTitle: { fontFamily: "Georgia, serif", fontSize: 22, color: "#1C1C1E" },
  addBtn: { background: "#1C1C1E", color: "#F2C4CE", border: "none", padding: "8px 16px", borderRadius: 20, fontFamily: "inherit", fontSize: 12, cursor: "pointer" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 10 },
  clothCard: { background: "#fff", borderRadius: 12, overflow: "hidden", border: "0.5px solid #e0ddd8", cursor: "pointer", transition: "all 0.2s", position: "relative" },
  clothCardSelected: { border: "2px solid #C97A8E", boxShadow: "0 0 0 3px rgba(201,122,142,0.12)" },
  clothImg: { width: "100%", aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34, background: "#f0ece6" },
  clothInfo: { padding: "7px 8px" },
  clothName: { fontSize: 11, fontWeight: 500, color: "#1C1C1E", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  clothColor: { fontSize: 10, color: "#8A8A8E", marginTop: 2 },
  selectBadge: { position: "absolute", top: 6, right: 6, width: 18, height: 18, borderRadius: "50%", background: "#C97A8E", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 9 },
  outfitPanel: { background: "#fff", borderRadius: 14, border: "0.5px solid #e0ddd8", padding: 18, marginTop: 18 },
  outfitPanelHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  sectionTitle: { fontFamily: "Georgia, serif", fontSize: 17, color: "#1C1C1E" },
  genBtn: { background: "linear-gradient(135deg,#C97A8E,#E8A4B5)", color: "#fff", border: "none", padding: "9px 18px", borderRadius: 20, fontFamily: "inherit", fontSize: 12, cursor: "pointer", fontWeight: 500 },
  chips: { display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 14 },
  chip: { padding: "5px 13px", borderRadius: 20, border: "0.5px solid #e0ddd8", fontSize: 12, cursor: "pointer", background: "none", fontFamily: "inherit", color: "#8A8A8E", transition: "all 0.2s" },
  chipActive: { background: "#1C1C1E", color: "#F2C4CE", borderColor: "#1C1C1E" },
  outfitResult: { animation: "fadeIn 0.4s ease" },
  outfitRow: { display: "flex", alignItems: "flex-start", gap: 8, flexWrap: "wrap" },
  outfitPiece: { display: "flex", flexDirection: "column", alignItems: "center" },
  aiNote: { marginTop: 14, background: "#faf3f5", borderLeft: "3px solid #C97A8E", borderRadius: "0 8px 8px 0", padding: "10px 14px", fontSize: 13, color: "#7a4a55", lineHeight: 1.6 },
  saveBtn: { marginTop: 12, background: "none", border: "0.5px solid #C97A8E", color: "#C97A8E", padding: "7px 16px", borderRadius: 20, fontFamily: "inherit", fontSize: 12, cursor: "pointer" },
  savedOutfitCard: { background: "#fff", borderRadius: 14, border: "0.5px solid #e0ddd8", padding: 16 },
  occasionBadge: { background: "rgba(201,122,142,0.1)", color: "#C97A8E", fontSize: 11, padding: "3px 10px", borderRadius: 10 },
  loadingBar: { marginTop: 16, padding: 14, background: "#faf3f5", borderRadius: 10, fontSize: 13, color: "#C97A8E", textAlign: "center" },
  uploadArea: { border: "1.5px dashed #C97A8E", borderRadius: 14, padding: 30, textAlign: "center", cursor: "pointer", transition: "all 0.2s", background: "rgba(201,122,142,0.02)", display: "flex", flexDirection: "column", alignItems: "center" },
  previewCard: { background: "#fff", borderRadius: 14, border: "0.5px solid #e0ddd8", overflow: "hidden" },
  demoBtn: { marginTop: 12, background: "none", border: "0.5px solid #e0ddd8", color: "#888", padding: "6px 14px", borderRadius: 20, fontFamily: "inherit", fontSize: 11, cursor: "pointer" },
  inputLabel: { fontSize: 12, color: "#8A8A8E", display: "block", marginBottom: 5 },
  input: { width: "100%", padding: "9px 12px", border: "0.5px solid #e0ddd8", borderRadius: 9, fontFamily: "inherit", fontSize: 13, background: "#fff", color: "#1C1C1E", outline: "none" },
  confirmAddBtn: { background: "#1C1C1E", color: "#F2C4CE", border: "none", padding: 11, borderRadius: 10, fontFamily: "inherit", fontSize: 13, cursor: "pointer", marginTop: "auto" },
  tag: { fontSize: 10, padding: "3px 9px", borderRadius: 10, background: "rgba(201,122,142,0.1)", color: "#C97A8E" },
};
