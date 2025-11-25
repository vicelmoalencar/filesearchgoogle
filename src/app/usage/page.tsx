"use client";

import { useState, useEffect } from "react";
import { Database, HardDrive, FileText, Calendar, CheckCircle } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

interface Document {
    name: string;
    size: number;
    sizeMB: string;
    state: string;
    createTime: string;
}

interface UsageData {
    store: {
        name: string;
        displayName: string;
        createTime: string;
        updateTime: string;
    };
    documentCount: number;
    totalSize: number;
    totalSizeMB: string;
    totalSizeGB: string;
    percentUsed: string;
    storageLimit: string;
    documents: Document[];
    info: string;
}

export default function UsagePage() {
    const [usage, setUsage] = useState<UsageData | null>(null);
    const [loading, setLoading] = useState(true);
    const { theme } = useTheme();

    useEffect(() => {
        fetchUsage();
    }, []);

    const fetchUsage = async () => {
        try {
            const res = await fetch("/api/usage");
            const data = await res.json();
            setUsage(data);
        } catch (error) {
            console.error("Failed to fetch usage", error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getProgressColor = (percent: string) => {
        const value = parseFloat(percent);
        if (value < 50) return "bg-green-500";
        if (value < 80) return "bg-yellow-500";
        return "bg-red-500";
    };

    if (loading) {
        return (
            <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-black' : 'bg-white'}`}>
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Carregando dados de uso...</p>
                </div>
            </div>
        );
    }

    if (!usage || !usage.store) {
        return (
            <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-black' : 'bg-white'}`}>
                <div className="text-center">
                    <Database className={`w-16 h-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
                    <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Nenhum File Search Store encontrado</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`min-h-screen p-8 max-w-7xl mx-auto ${theme === 'dark' ? 'bg-black' : 'bg-white'}`}>
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-2">
                    Uso da API Gemini
                </h1>
                <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Monitoramento de armazenamento e documentos</p>
            </div>

            {/* Storage Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Documents Count */}
                <div className="glass rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <FileText className="w-8 h-8 text-blue-400" />
                        <span className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{usage.documentCount}</span>
                    </div>
                    <h3 className={`text-sm uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Documentos</h3>
                    <p className={`text-xs mt-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>Indexados e ativos</p>
                </div>

                {/* Storage Used */}
                <div className="glass rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <HardDrive className="w-8 h-8 text-purple-400" />
                        <span className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{usage.totalSizeMB} MB</span>
                    </div>
                    <h3 className={`text-sm uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Espaço Usado</h3>
                    <p className={`text-xs mt-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>{usage.totalSizeGB} GB de 1 GB</p>
                </div>

                {/* Percentage Used */}
                <div className="glass rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <Database className="w-8 h-8 text-green-400" />
                        <span className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{usage.percentUsed}</span>
                    </div>
                    <h3 className={`text-sm uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Limite Usado</h3>
                    <p className={`text-xs mt-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>do plano gratuito</p>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="glass rounded-2xl p-6 mb-8">
                <div className="flex items-center justify-between mb-3">
                    <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Armazenamento</h3>
                    <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{usage.totalSizeMB} MB / 1024 MB</span>
                </div>
                <div className={`w-full rounded-full h-3 overflow-hidden ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'}`}>
                    <div
                        className={`h-full ${getProgressColor(usage.percentUsed)} transition-all duration-500 rounded-full`}
                        style={{ width: usage.percentUsed }}
                    ></div>
                </div>
                <p className={`text-xs mt-3 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>{usage.info}</p>
            </div>

            {/* Store Info */}
            <div className="glass rounded-2xl p-6 mb-8">
                <h2 className={`text-xl font-bold mb-4 flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    <Database className="w-6 h-6 text-blue-400" />
                    Informações do Store
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <p className={`text-sm mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Nome</p>
                        <p className={`font-mono text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{usage.store.displayName}</p>
                    </div>
                    <div>
                        <p className={`text-sm mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>ID</p>
                        <p className={`font-mono text-xs break-all ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{usage.store.name}</p>
                    </div>
                    <div>
                        <p className={`text-sm mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Criado em</p>
                        <p className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{formatDate(usage.store.createTime)}</p>
                    </div>
                    <div>
                        <p className={`text-sm mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Atualizado em</p>
                        <p className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{formatDate(usage.store.updateTime)}</p>
                    </div>
                </div>
            </div>

            {/* Documents List */}
            <div className="glass rounded-2xl overflow-hidden">
                <div className={`p-6 ${theme === 'dark' ? 'border-b border-white/10' : 'border-b border-gray-200'}`}>
                    <h2 className={`text-xl font-bold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        <FileText className="w-6 h-6 text-purple-400" />
                        Documentos ({usage.documentCount})
                    </h2>
                </div>

                {usage.documents.length === 0 ? (
                    <div className="p-12 text-center">
                        <FileText className={`w-12 h-12 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
                        <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Nenhum documento encontrado</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className={`text-sm uppercase tracking-wider ${theme === 'dark' ? 'bg-white/5 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
                                <tr>
                                    <th className="p-4 text-left font-medium">Nome</th>
                                    <th className="p-4 text-left font-medium">Tamanho</th>
                                    <th className="p-4 text-left font-medium">Estado</th>
                                    <th className="p-4 text-left font-medium">Data de Upload</th>
                                </tr>
                            </thead>
                            <tbody className={theme === 'dark' ? 'divide-y divide-white/5' : 'divide-y divide-gray-200'}>
                                {usage.documents.map((doc, index) => (
                                    <tr key={index} className={`transition-colors ${theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}>
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                                                    <FileText className="w-5 h-5" />
                                                </div>
                                                <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{doc.name}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>{doc.sizeMB} MB</span>
                                            <span className={`text-xs ml-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>({doc.size.toLocaleString()} bytes)</span>
                                        </td>
                                        <td className="p-4">
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400">
                                                <CheckCircle className="w-3 h-3" />
                                                {doc.state === 'STATE_ACTIVE' ? 'ATIVO' : doc.state}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className={`flex items-center gap-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                                <Calendar className={`w-4 h-4 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
                                                {formatDate(doc.createTime)}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Back Button */}
            <div className="mt-8 text-center">
                <a
                    href="/"
                    className={`inline-flex items-center gap-2 px-6 py-3 rounded-full transition-all font-medium ${
                        theme === 'dark'
                            ? 'bg-white/5 hover:bg-white/10 text-white'
                            : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                    }`}
                >
                    ← Voltar ao Chat
                </a>
            </div>
        </div>
    );
}
