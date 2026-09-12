import React, { useState } from 'react';

const INITIAL_NOTES = [
  {
    id: '1',
    title: 'Patience > FOMO',
    content: 'Wait for confluence: liquidity sweep + CHoCH; skip mediocre setups; fewer trades, cleaner R.',
    folder: 'Strategy Notes',
    tags: [
      { text: 'CHoCH', color: 'cyan' },
      { text: 'Liquidity', color: 'rose' },
      { text: 'Patience', color: 'slate' },
    ],
    updatedAt: '2 hours ago',
  },
  {
    id: '2',
    title: 'Data First',
    content: 'Backtest the strategy & following the plan > 200 trades with bad entries;',
    folder: 'Strategy Notes',
    badge: 'Gathering Data',
    tags: [],
    updatedAt: '1 day ago',
  },
  {
    id: '3',
    title: 'Liquidity Sweep + CHoCH',
    content: 'Stops above swing taken, instant CHoCH on M5; OB tap, partials at FVG close; +2R reached often.',
    folder: 'Strategy Notes',
    tags: [
      { text: 'CHoCH', color: 'cyan' },
      { text: 'Order Block', color: 'purple' },
      { text: 'Fair Value Gap', color: 'emerald' },
      { text: 'Liquidity', color: 'rose' },
    ],
    updatedAt: '3 days ago',
  },
  {
    id: '4',
    title: 'FVG Efficiency',
    content: 'HTF FVG drags price; LTF mitigation entries improve RR; average hold ~45m in trend days.',
    folder: 'Strategy Notes',
    tags: [
      { text: 'Order Block', color: 'purple' },
      { text: 'Fair Value Gap', color: 'emerald' },
    ],
    updatedAt: '4 days ago',
  },
  {
    id: '5',
    title: 'Premium/Discount Framework',
    content: 'Bias long only in discount of daily range; ignore buys in premium; DD and chop trades drop.',
    folder: 'Trade Reviews',
    tags: [
      { text: 'BoS', color: 'cyan' },
      { text: 'Premium/Discount', color: 'blue' },
    ],
    updatedAt: '1 week ago',
  },
];

const DEFAULT_FOLDERS = ['Strategy Notes', 'Trade Reviews', 'Mindset & Models'];

const TAG_COLOR_MAP = {
  cyan: 'bg-cyan-950/70 border-cyan-500/40 text-cyan-300',
  rose: 'bg-rose-950/70 border-rose-500/40 text-rose-300',
  purple: 'bg-purple-950/70 border-purple-500/40 text-purple-300',
  emerald: 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300',
  amber: 'bg-amber-950/70 border-amber-500/40 text-amber-300',
  blue: 'bg-blue-950/70 border-blue-500/40 text-blue-300',
  slate: 'bg-slate-800/80 border-slate-700 text-slate-300',
};

const NotebookView = () => {
  const [notes, setNotes] = useState(INITIAL_NOTES);
  const [folders, setFolders] = useState(DEFAULT_FOLDERS);
  const [activeFolder, setActiveFolder] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingNote, setEditingNote] = useState(null);

  // Form State for Note
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formFolder, setFormFolder] = useState('Strategy Notes');
  const [formTagsStr, setFormTagsStr] = useState('CHoCH, Liquidity');

  const openCreateModal = () => {
    setEditingNote(null);
    setFormTitle('');
    setFormContent('');
    setFormFolder(folders[0] || 'Strategy Notes');
    setFormTagsStr('CHoCH, Liquidity');
    setIsModalOpen(true);
  };

  const openEditModal = (note) => {
    setEditingNote(note);
    setFormTitle(note.title);
    setFormContent(note.content);
    setFormFolder(note.folder || 'Strategy Notes');
    setFormTagsStr(note.tags ? note.tags.map((t) => t.text).join(', ') : '');
    setIsModalOpen(true);
  };

  const handleSaveNote = (e) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const parsedTags = formTagsStr
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
      .map((text) => {
        const lower = text.toLowerCase();
        let color = 'cyan';
        if (lower.includes('liquidity')) color = 'rose';
        else if (lower.includes('block') || lower.includes('ob')) color = 'purple';
        else if (lower.includes('fvg') || lower.includes('gap')) color = 'emerald';
        else if (lower.includes('data') || lower.includes('plan')) color = 'amber';
        else if (lower.includes('discount') || lower.includes('premium')) color = 'blue';
        else if (lower.includes('patience')) color = 'slate';
        return { text, color };
      });

    if (editingNote) {
      setNotes((prev) =>
        prev.map((n) =>
          n.id === editingNote.id
            ? {
                ...n,
                title: formTitle,
                content: formContent,
                folder: formFolder,
                tags: parsedTags,
                updatedAt: 'Just now',
              }
            : n
        )
      );
    } else {
      const newNote = {
        id: Date.now().toString(),
        title: formTitle,
        content: formContent,
        folder: formFolder,
        tags: parsedTags,
        updatedAt: 'Just now',
      };
      setNotes((prev) => [newNote, ...prev]);
    }
    setIsModalOpen(false);
  };

  const handleDeleteNote = (id) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const handleAddFolder = (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    if (!folders.includes(newFolderName.trim())) {
      setFolders((prev) => [...prev, newFolderName.trim()]);
    }
    setNewFolderName('');
    setIsFolderModalOpen(false);
  };

  // Filter notes based on active folder & search query
  const filteredNotes = notes.filter((note) => {
    const matchesFolder = activeFolder === 'All' || note.folder === activeFolder;
    const matchesSearch =
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (note.tags && note.tags.some((t) => t.text.toLowerCase().includes(searchQuery.toLowerCase())));
    return matchesFolder && matchesSearch;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* ── Top Bar Header ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Notebook</h1>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes..."
              className="pl-9 pr-3 py-1.5 w-48 focus:w-64 transition-all duration-200 rounded-xl bg-[#0e131f] border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* View Layout Toggle */}
          <div className="flex items-center p-1 rounded-xl bg-[#0e131f] border border-slate-800 text-slate-400">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'grid' ? 'bg-slate-800 text-cyan-400 font-bold' : 'hover:text-white'
              }`}
              title="Grid View"
            >
              <i className="ri-layout-grid-line text-sm" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'list' ? 'bg-slate-800 text-cyan-400 font-bold' : 'hover:text-white'
              }`}
              title="List View"
            >
              <i className="ri-list-check text-sm" />
            </button>
          </div>

          {/* Create Note Button */}
          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 active:scale-95 transition-all"
          >
            <span>Create Note +</span>
          </button>
        </div>
      </div>

      {/* ── Section Title & Folders Bar ───────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-200">
            {activeFolder === 'All' ? 'All Notes' : activeFolder}
            <span className="ml-2 text-xs font-normal text-slate-500">({filteredNotes.length})</span>
          </h2>
        </div>

        {/* Folders Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setIsFolderModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0e131f] hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white text-xs font-medium transition-all shrink-0"
          >
            <i className="ri-folder-add-line text-cyan-400" />
            <span>Add Folder</span>
          </button>

          <button
            onClick={() => setActiveFolder('All')}
            className={`px-3.5 py-1.5 rounded-xl border text-xs font-medium transition-all shrink-0 ${
              activeFolder === 'All'
                ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-400 font-bold'
                : 'bg-[#0e131f] border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            All Notes
          </button>

          {folders.map((folder) => (
            <div key={folder} className="relative group shrink-0">
              <button
                onClick={() => setActiveFolder(folder)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                  activeFolder === folder
                    ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-400 font-bold'
                    : 'bg-[#0e131f] border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <i className="ri-folder-3-line text-slate-500" />
                <span>{folder}</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── Notes Display Grid / List ─────────────────────────────────── */}
      {filteredNotes.length === 0 ? (
        <div className="rounded-2xl p-12 bg-[#0e131f] border border-slate-800/80 shadow-2xl flex flex-col items-center justify-center gap-3 text-slate-500">
          <i className="ri-book-read-line text-4xl text-slate-700" />
          <p className="text-sm font-medium">No notes found in this section.</p>
          <button
            onClick={openCreateModal}
            className="text-xs text-cyan-400 font-bold hover:underline"
          >
            + Create your first note
          </button>
        </div>
      ) : (
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'
              : 'space-y-3'
          }
        >
          {filteredNotes.map((note) => (
            <div
              key={note.id}
              className="group relative rounded-2xl p-5 bg-[#0e131f] border border-slate-800/80 shadow-xl hover:border-slate-700 transition-all duration-200 flex flex-col justify-between gap-4"
            >
              <div className="space-y-2.5">
                {/* Note Title */}
                <h3 className="text-sm font-bold text-slate-100 group-hover:text-cyan-300 transition-colors pr-6">
                  {note.title}
                </h3>

                {/* Content Snippet */}
                <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">
                  {note.content}
                </p>

                {/* Badge if present */}
                {note.badge && (
                  <div className="inline-block mt-1 px-2.5 py-1 rounded-lg bg-amber-950/80 border border-amber-500/40 text-amber-300 text-[10px] font-bold">
                    {note.badge}
                  </div>
                )}

                {/* Tags */}
                {note.tags && note.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {note.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className={`px-2 py-0.5 rounded-md border text-[10px] font-semibold ${
                          TAG_COLOR_MAP[tag.color] || TAG_COLOR_MAP.cyan
                        }`}
                      >
                        {tag.text}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Bottom Footer: Folder & Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-800/50 text-[11px] text-slate-500">
                <span>{note.folder}</span>
                <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEditModal(note)}
                    className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-400 transition-colors"
                    title="Edit Note"
                  >
                    <i className="ri-pencil-line" />
                  </button>
                  <button
                    onClick={() => handleDeleteNote(note.id)}
                    className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition-colors"
                    title="Delete Note"
                  >
                    <i className="ri-delete-bin-line" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Create / Edit Note Modal ──────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[#0b0e14] border border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">
                {editingNote ? 'Edit Note' : 'Create New Note'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <i className="ri-close-line text-xl" />
              </button>
            </div>

            <form onSubmit={handleSaveNote} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Patience > FOMO"
                  className="w-full p-2.5 rounded-xl bg-[#0e131f] border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Folder</label>
                <select
                  value={formFolder}
                  onChange={(e) => setFormFolder(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#0e131f] border border-slate-800 text-white focus:outline-none focus:border-cyan-500"
                >
                  {folders.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Tags (Comma separated)</label>
                <input
                  type="text"
                  value={formTagsStr}
                  onChange={(e) => setFormTagsStr(e.target.value)}
                  placeholder="CHoCH, Order Block, Liquidity"
                  className="w-full p-2.5 rounded-xl bg-[#0e131f] border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Content / Rule</label>
                <textarea
                  rows={4}
                  required
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="Describe your strategy confluence, execution steps or trade rules..."
                  className="w-full p-2.5 rounded-xl bg-[#0e131f] border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 font-semibold hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold shadow-md shadow-cyan-500/20"
                >
                  Save Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add Folder Modal ──────────────────────────────────────────── */}
      {isFolderModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#0b0e14] border border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Add New Folder</h3>
              <button
                onClick={() => setIsFolderModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <i className="ri-close-line text-xl" />
              </button>
            </div>

            <form onSubmit={handleAddFolder} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Folder Name</label>
                <input
                  type="text"
                  required
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="e.g. Risk Management"
                  className="w-full p-2.5 rounded-xl bg-[#0e131f] border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsFolderModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 font-semibold hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold"
                >
                  Add Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotebookView;
