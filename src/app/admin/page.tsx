
"use client";

import { useState, useEffect } from "react";
import { Upload, Trash2, FileText, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import AdminRoute from "@/components/AdminRoute";

interface FileItem {
    name: string;
    displayName: string;
    mimeType: string;
    state: string;
    uri: string;
}

interface ApiKey {
    id: string;
    name: string;
    theme: string;
}

export default function AdminPage() {
    const [files, setFiles] = useState<FileItem[]>([]);
    const [uploading, setUploading] = useState(false);
    const [loading, setLoading] = useState(true);
    const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
    const [selectedKeyId, setSelectedKeyId] = useState<string>("");

    useEffect(() => {
        fetchFiles();
        loadApiKeys();
    }, []);

    const loadApiKeys = async () => {
        try {
            const response = await fetch('/api/api-keys');
            const data = await response.json();
            if (data.keys && data.keys.length > 0) {
                setApiKeys(data.keys);
                setSelectedKeyId(data.keys[0].id);
            }
        } catch (error) {
            console.error('Erro ao carregar chaves:', error);
        }
    };

    const fetchFiles = async () => {
        try {
            console.log("Fetching files from API...");
            const res = await fetch("/api/files");
            const data = await res.json();
            console.log("API response:", data);
            console.log("Number of files:", data.files?.length || 0);
            if (data.files) {
                setFiles(data.files);
                console.log("Files set to state:", data.files);
            }
        } catch (error) {
            console.error("Failed to fetch files", error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        const file = e.target.files[0];
        const fileSizeMB = file.size / (1024 * 1024);

        // Warn user if file is too large
        if (fileSizeMB > 10) {
            const proceed = confirm(
                `⚠️ ATENÇÃO: Arquivo grande detectado (${fileSizeMB.toFixed(2)}MB)\n\n` +
                `A API do Gemini tem problemas conhecidos com arquivos maiores que 10MB e provavelmente falhará.\n\n` +
                `Recomendações:\n` +
                `• Comprima o PDF antes de fazer upload\n` +
                `• Divida em arquivos menores (5-10MB)\n` +
                `• Converta para formato menor se possível\n\n` +
                `Deseja tentar fazer upload mesmo assim?`
            );
            if (!proceed) {
                e.target.value = "";
                return;
            }
        }

        setUploading(true);
        const formData = new FormData();
        formData.append("file", file);
        if (selectedKeyId) {
            formData.append("apiKeyId", selectedKeyId);
        }

        // Use resumable upload for files larger than 10MB
        const uploadEndpoint = fileSizeMB > 10 ? "/api/upload-resumable" : "/api/upload";
        console.log(`Using ${uploadEndpoint} for ${fileSizeMB.toFixed(2)}MB file`);

        try {
            const res = await fetch(uploadEndpoint, {
                method: "POST",
                body: formData,
            });

            if (res.ok) {
                await fetchFiles();
                alert("File uploaded successfully!");
            } else {
                const errorData = await res.json();
                const errorMessage = errorData.error || "Upload failed";
                const guidance = errorData.guidance || "";

                // Show detailed error with guidance
                if (guidance) {
                    alert(`${errorMessage}\n\n${guidance}`);
                } else {
                    alert(errorMessage + "\n\nDetails: " + (errorData.details || "Unknown error"));
                }
            }
        } catch (error) {
            console.error("Upload error", error);
            alert("Network error: Could not connect to the server. Please check your connection and try again.");
        } finally {
            setUploading(false);
            // Reset input
            e.target.value = "";
        }
    };

    const handleDelete = async (name: string) => {
        if (!confirm("Are you sure you want to delete this file?")) return;

        try {
            const res = await fetch(`/api/files?name=${name}`, {
                method: "DELETE",
            });

            if (res.ok) {
                setFiles(files.filter((f) => f.name !== name));
            } else {
                alert("Delete failed");
            }
        } catch (error) {
            console.error("Delete error", error);
        }
    };

    return (
        <AdminRoute>
        <div className="min-h-screen p-8 max-w-6xl mx-auto">
            <header className="mb-12 flex justify-between items-center">
                <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                        File Manager
                    </h1>
                    <p className="text-gray-400 mt-2">Upload and manage your knowledge base</p>
                    <div className="flex gap-4 mt-3 items-center">
                        <a
                            href="/admin/prompt"
                            className="text-sm text-blue-400 hover:text-blue-300 underline"
                        >
                            ⚙️ Configurar Prompt do Sistema
                        </a>
                        <a
                            href="/admin/api-keys"
                            className="text-sm text-blue-400 hover:text-blue-300 underline"
                        >
                            🔑 Gerenciar Chaves de API
                        </a>
                        {apiKeys.length > 0 && (
                            <div className="flex items-center gap-2 ml-4">
                                <label className="text-sm text-gray-400">
                                    Upload para:
                                </label>
                                <select
                                    value={selectedKeyId}
                                    onChange={(e) => setSelectedKeyId(e.target.value)}
                                    className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white/5 border-white/10 text-white hover:bg-white/10 border focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
                                >
                                    {apiKeys.map((key) => (
                                        <option key={key.id} value={key.id} className="bg-gray-900">
                                            {key.theme} - {key.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                </div>
                <div className="relative">
                    <input
                        type="file"
                        id="file-upload"
                        className="hidden"
                        onChange={handleUpload}
                        disabled={uploading}
                    />
                    <label
                        htmlFor="file-upload"
                        className={`flex items-center gap-2 px-6 py-3 rounded-full bg-blue-600 hover:bg-blue-500 transition-all cursor-pointer font-medium shadow-lg shadow-blue-900/20 ${uploading ? "opacity-50 cursor-not-allowed" : ""
                            }`}
                    >
                        {uploading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Upload className="w-5 h-5" />
                        )}
                        {uploading ? "Uploading..." : "Upload File"}
                    </label>
                </div>
            </header>

            <div className="grid gap-6">
                {loading ? (
                    <div className="text-center py-20 text-gray-500">Loading files...</div>
                ) : files.length === 0 ? (
                    <div className="text-center py-20 glass rounded-2xl border-dashed border-2 border-white/10">
                        <FileText className="w-12 h-12 mx-auto text-gray-600 mb-4" />
                        <p className="text-gray-400">No files uploaded yet</p>
                    </div>
                ) : (
                    <div className="glass rounded-2xl overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-white/5 text-gray-400 text-sm uppercase tracking-wider">
                                <tr>
                                    <th className="p-6 font-medium">Name</th>
                                    <th className="p-6 font-medium">Type</th>
                                    <th className="p-6 font-medium">Status</th>
                                    <th className="p-6 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {files.map((file) => (
                                    <tr key={file.name} className="hover:bg-white/5 transition-colors">
                                        <td className="p-6 font-medium flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                                                <FileText className="w-5 h-5" />
                                            </div>
                                            {file.displayName}
                                        </td>
                                        <td className="p-6 text-gray-400 text-sm">{file.mimeType}</td>
                                        <td className="p-6">
                                            <span
                                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${file.state === "ACTIVE"
                                                        ? "bg-green-500/10 text-green-400"
                                                        : file.state === "FAILED"
                                                            ? "bg-red-500/10 text-red-400"
                                                            : "bg-yellow-500/10 text-yellow-400"
                                                    }`}
                                            >
                                                {file.state === "ACTIVE" ? (
                                                    <CheckCircle className="w-3 h-3" />
                                                ) : file.state === "FAILED" ? (
                                                    <AlertCircle className="w-3 h-3" />
                                                ) : (
                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                )}
                                                {file.state}
                                            </span>
                                        </td>
                                        <td className="p-6 text-right">
                                            <button
                                                onClick={() => handleDelete(file.name)}
                                                className="p-2 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors"
                                                title="Delete file"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
        </AdminRoute>
    );
}
