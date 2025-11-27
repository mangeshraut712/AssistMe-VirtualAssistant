import React, { useState, useRef } from 'react';
import { Upload, File, Image as ImageIcon, Video, FileText, X, Download, Eye } from 'lucide-react';

const FileUploadPanel = ({ isOpen, onClose, onFileProcess }) => {
    const [files, setFiles] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [results, setResults] = useState([]);
    const fileInputRef = useRef(null);

    const handleFileSelect = (event) => {
        const selectedFiles = Array.from(event.target.files);
        setFiles(prev => [...prev, ...selectedFiles]);
    };

    const handleDrop = (event) => {
        event.preventDefault();
        const droppedFiles = Array.from(event.dataTransfer.files);
        setFiles(prev => [...prev, ...droppedFiles]);
    };

    const removeFile = (index) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const processFiles = async () => {
        setIsProcessing(true);
        setResults([]);

        for (const file of files) {
            try {
                const formData = new FormData();
                formData.append('file', file);

                // Determine the processing endpoint based on file type
                let endpoint = '/api/files/process';
                if (file.type.startsWith('image/')) {
                    endpoint = '/api/vision/analyze';
                } else if (file.type.startsWith('video/')) {
                    endpoint = '/api/video/analyze';
                } else if (file.type === 'application/pdf' || file.type.includes('document')) {
                    endpoint = '/api/documents/extract';
                }

                const response = await fetch(endpoint, {
                    method: 'POST',
                    body: formData
                });

                const data = await response.json();

                setResults(prev => [...prev, {
                    fileName: file.name,
                    fileType: file.type,
                    result: data,
                    success: response.ok
                }]);
            } catch (error) {
                setResults(prev => [...prev, {
                    fileName: file.name,
                    fileType: file.type,
                    error: error.message,
                    success: false
                }]);
            }
        }

        setIsProcessing(false);
        if (onFileProcess) {
            onFileProcess(results);
        }
    };

    const getFileIcon = (type) => {
        if (type.startsWith('image/')) return <ImageIcon className="h-5 w-5" />;
        if (type.startsWith('video/')) return <Video className="h-5 w-5" />;
        if (type.includes('pdf') || type.includes('document')) return <FileText className="h-5 w-5" />;
        return <File className="h-5 w-5" />;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-card border border-border rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4">
                {/* Header */}
                <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Upload className="h-5 w-5" />
                            File Upload & Analysis
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            Upload images, videos, documents, and more for AI processing
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-accent rounded-lg transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Drop Zone */}
                    <div
                        onDrop={handleDrop}
                        onDragOver={(e) => e.preventDefault()}
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-border rounded-xl p-12 text-center cursor-pointer hover:border-primary transition-colors bg-muted/20"
                    >
                        <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-lg font-semibold mb-2">Drop files here or click to upload</p>
                        <p className="text-sm text-muted-foreground">
                            Supports: Images (JPG, PNG, WebP), Videos (MP4, MOV), Documents (PDF, DOCX), and more
                        </p>
                        <input
                            id="file-upload-panel"
                            name="file-upload-panel"
                            ref={fileInputRef}
                            type="file"
                            multiple
                            onChange={handleFileSelect}
                            className="hidden"
                            accept="image/*,video/*,.pdf,.doc,.docx,.txt"
                        />
                    </div>

                    {/* File List */}
                    {files.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold">Selected Files ({files.length})</h3>
                                <button
                                    onClick={() => setFiles([])}
                                    className="text-sm text-red-500 hover:text-red-600"
                                >
                                    Clear All
                                </button>
                            </div>
                            <div className="space-y-2">
                                {files.map((file, idx) => (
                                    <div key={idx} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                                        <div className="text-primary">
                                            {getFileIcon(file.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{file.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {(file.size / 1024 / 1024).toFixed(2)} MB
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => removeFile(idx)}
                                            className="p-1 hover:bg-background rounded transition-colors"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Process Button */}
                    {files.length > 0 && (
                        <button
                            onClick={processFiles}
                            disabled={isProcessing}
                            className="w-full py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors font-medium"
                        >
                            {isProcessing ? 'Processing...' : `Process ${files.length} File${files.length > 1 ? 's' : ''}`}
                        </button>
                    )}

                    {/* Results */}
                    {results.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="font-semibold">Processing Results</h3>
                            {results.map((result, idx) => (
                                <div key={idx} className={`p-4 rounded-lg border ${result.success ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'
                                    }`}>
                                    <div className="flex items-start gap-3">
                                        {getFileIcon(result.fileType)}
                                        <div className="flex-1">
                                            <p className="font-medium mb-2">{result.fileName}</p>
                                            {result.success ? (
                                                <div className="text-sm text-muted-foreground">
                                                    {result.result.description || result.result.text || 'Processed successfully'}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-red-500">{result.error}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FileUploadPanel;
