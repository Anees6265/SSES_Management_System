import { useState } from "react";
import { toast } from "react-toastify";
import { MdArrowUpward, MdCheckCircle, MdInsertDriveFile, MdFolder, MdOpenInNew, MdSearch, MdClose } from "react-icons/md";
import {
    useGetMyStudentProfileQuery,
    useGetMyExtraDocumentsQuery,
    useUploadMyExtraDocumentMutation,
} from "../../../redux/api/studentApi";

const formatDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

// ── Doc Card ──────────────────────────────────────────────────────────────────
const DocCard = ({ doc }) => (
    <div className="bg-white rounded-xl border border-gray-100 p-3.5 shadow-sm hover:shadow-md hover:border-orange-100 transition-all duration-200">
        <div className="flex items-start gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                doc.fileType === "pdf" ? "bg-red-50 text-red-500" : "bg-blue-50 text-blue-500"
            }`}>
                <MdInsertDriveFile size={18} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-800 truncate">{doc.title || "Document"}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                    {(doc.fileType || "file").toUpperCase()} · {formatDate(doc.uploadedAt)}
                </p>
                {doc.remark && (
                    <p className="text-[11px] text-gray-500 mt-1 truncate">{doc.remark}</p>
                )}
            </div>
        </div>
        <div className="flex justify-end mt-2.5 pt-2.5 border-t border-gray-50">
            <button onClick={() => window.open(doc.fileURL, "_blank", "noopener,noreferrer")}
                className="flex items-center gap-1 text-[11px] font-semibold text-orange-500 hover:text-orange-600 transition-colors">
                <MdOpenInNew size={12} /> Open
            </button>
        </div>
    </div>
);

// ── Upload Modal ──────────────────────────────────────────────────────────────
const UploadModal = ({ onClose, onSuccess }) => {
    const [title,   setTitle]   = useState("");
    const [remark,  setRemark]  = useState("");
    const [file,    setFile]    = useState(null);
    const [fileErr, setFileErr] = useState("");
    const [uploadDoc, { isLoading }] = useUploadMyExtraDocumentMutation();

    const handleFile = (e) => {
        const f = e.target.files[0];
        if (!f) return;
        if (!f.type.startsWith("image/") && f.type !== "application/pdf") {
            setFileErr("Only image or PDF allowed"); return;
        }
        if (f.size > 5 * 1024 * 1024) { setFileErr("File must be under 5 MB"); return; }
        setFileErr("");
        setFile(f);
        if (!title.trim()) setTitle(f.name.replace(/\.[^/.]+$/, ""));
    };

    const handleUpload = async () => {
        if (!title.trim()) { toast.error("Title is required"); return; }
        if (!file)         { toast.error("Please select a file"); return; }

        const fileData = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (ev) => resolve(ev.target.result);
            reader.readAsDataURL(file);
        });

        try {
            await uploadDoc({
                title: title.trim(),
                fileData,
                fileType: file.type === "application/pdf" ? "pdf" : "image",
                remark: remark.trim() || undefined,
            }).unwrap();
            toast.success("Document uploaded successfully!");
            onSuccess?.();
            onClose();
        } catch (err) {
            toast.error(err?.data?.message || "Upload failed");
        }
    };

    const ic = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400 bg-gray-50 transition-all duration-200";
    const lc = "block text-xs font-semibold text-gray-600 mb-1.5";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <div>
                        <h3 className="text-sm font-bold text-gray-800">Upload Document</h3>
                        <p className="text-xs text-gray-400 mt-0.5">Image or PDF, max 5 MB</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                        <MdClose size={18} />
                    </button>
                </div>

                <div className="px-5 py-4 space-y-4">
                    <div>
                        <label className={lc}>Title <span className="text-red-400">*</span></label>
                        <input value={title} onChange={e => setTitle(e.target.value)}
                            placeholder="Resume, certificate..." className={ic} />
                    </div>

                    <div>
                        <label className={lc}>File <span className="text-red-400">*</span></label>
                        <label className={`flex items-center gap-3 border-2 border-dashed rounded-xl px-4 py-3 cursor-pointer transition-all duration-200 ${
                            file ? "border-green-300 bg-green-50" : "border-gray-200 hover:border-orange-300 bg-gray-50"
                        }`}>
                            <MdArrowUpward size={18} className={file ? "text-green-500" : "text-gray-400"} />
                            <p className={`text-xs ${file ? "font-semibold text-green-700" : "text-gray-500"}`}>
                                {file ? file.name : "Click to upload image or PDF"}
                            </p>
                            <input type="file" accept="image/*,.pdf" onChange={handleFile} className="hidden" />
                        </label>
                        {fileErr && <p className="text-[11px] text-red-500 mt-1">{fileErr}</p>}
                    </div>

                    <div>
                        <label className={lc}>Remark <span className="text-gray-400 font-normal">(optional)</span></label>
                        <input value={remark} onChange={e => setRemark(e.target.value)}
                            placeholder="Short description..." className={ic} />
                    </div>
                </div>

                <div className="flex gap-3 px-5 pb-5">
                    <button onClick={onClose}
                        className="flex-1 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all duration-200">
                        Cancel
                    </button>
                    <button onClick={handleUpload} disabled={isLoading}
                        className={`flex-1 py-2.5 text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-all duration-200 ${
                            isLoading ? "bg-orange-300 text-white cursor-not-allowed" : "bg-orange-500 hover:bg-orange-600 text-white"
                        }`}>
                        {isLoading
                            ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            : <MdArrowUpward size={15} />}
                        Upload
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function StudentDocuments() {
    const [uploadOpen, setUploadOpen] = useState(false);
    const [search, setSearch]         = useState("");

    const { data: profileData }            = useGetMyStudentProfileQuery();
    const { data: extraData, refetch }     = useGetMyExtraDocumentsQuery();

    const allDocs   = profileData?.data?.documents || [];
    const coreDocs  = allDocs.filter(d => !d.isExtra);
    const extraDocs = extraData?.data || allDocs.filter(d => d.isExtra);
    const total     = coreDocs.length + extraDocs.length;

    const filteredCore  = coreDocs.filter(d =>
        !search || d.title?.toLowerCase().includes(search.toLowerCase())
    );
    const filteredExtra = extraDocs.filter(d =>
        !search || d.title?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-5">
            {uploadOpen && <UploadModal onClose={() => setUploadOpen(false)} onSuccess={refetch} />}

            {/* ── Header Card ── */}
            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                <div className="h-1.5 w-full bg-orange-500" />
                <div className="p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-base font-bold text-gray-900">My Documents</h2>
                            <p className="text-xs text-gray-400 mt-0.5">
                                {total} total · {coreDocs.length} core · {extraDocs.length} extra
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <MdSearch size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Search..."
                                    className="pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-orange-400 bg-gray-50 w-44 transition-all duration-200"
                                />
                            </div>
                            <button onClick={() => setUploadOpen(true)}
                                className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition-all duration-200 whitespace-nowrap">
                                <MdArrowUpward size={15} /> Upload
                            </button>
                        </div>
                    </div>

                    {/* Stat pills */}
                    <div className="flex items-center gap-3 mt-4 flex-wrap">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-200">
                            <MdFolder size={12} className="text-gray-500" />
                            <span className="text-xs font-bold text-gray-600">{total} Total</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-100">
                            <MdInsertDriveFile size={12} className="text-blue-500" />
                            <span className="text-xs font-bold text-blue-600">{coreDocs.length} Core</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-orange-50 border border-orange-100">
                            <MdCheckCircle size={12} className="text-orange-500" />
                            <span className="text-xs font-bold text-orange-600">{extraDocs.length} Extra</span>
                        </div>
                        <div className="flex-1 min-w-[120px]">
                            <div className="w-full bg-gray-100 rounded-full h-1.5">
                                <div className="h-1.5 rounded-full bg-orange-400 transition-all duration-700"
                                    style={{ width: total > 0 ? "100%" : "0%" }} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Two columns ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                {/* Core Documents */}
                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm">
                    <div className="px-5 py-4 border-b border-gray-50">
                        <h3 className="text-sm font-bold text-gray-800">Core Documents</h3>
                        <p className="text-xs text-gray-400 mt-0.5">ID proof, marksheets, admission documents</p>
                    </div>
                    <div className="p-3">
                        {filteredCore.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-2">
                                    <MdInsertDriveFile size={20} className="text-blue-200" />
                                </div>
                                <p className="text-xs font-semibold text-gray-500">No core documents yet</p>
                                <p className="text-xs text-gray-400 mt-1">Contact admin to upload your documents</p>
                            </div>
                        ) : (
                            <div className="space-y-2.5">
                                {filteredCore.map((doc, i) => <DocCard key={doc._id || i} doc={doc} />)}
                            </div>
                        )}
                    </div>
                </div>

                {/* Extra Documents */}
                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm">
                    <div className="px-5 py-4 border-b border-gray-50">
                        <h3 className="text-sm font-bold text-gray-800">Extra Documents</h3>
                        <p className="text-xs text-gray-400 mt-0.5">Resume, certificates, achievements</p>
                    </div>
                    <div className="p-3">
                        {filteredExtra.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center mb-2">
                                    <MdFolder size={20} className="text-orange-200" />
                                </div>
                                <p className="text-xs font-semibold text-gray-500">No extra documents yet</p>
                                <button onClick={() => setUploadOpen(true)}
                                    className="mt-2 text-xs font-semibold text-orange-500 hover:text-orange-600 underline underline-offset-2 transition-colors">
                                    Upload now →
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-2.5">
                                {filteredExtra.map((doc, i) => <DocCard key={doc._id || i} doc={doc} />)}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
