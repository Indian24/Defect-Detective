import React, { useState, useCallback } from 'react';
import { Upload, Zap, History, Settings, Eye, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { Button } from './components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Alert, AlertDescription } from './components/ui/alert';
import { Badge } from './components/ui/badge';
import { Separator } from './components/ui/separator';
import axios from 'axios';
import './App.css';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

function App() {
  const [activeTab, setActiveTab] = useState('analysis');
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);

  // Handle file drag and drop
  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        setSelectedFile(file);
        setError('');
      } else {
        setError('Please select a valid image file (JPG, PNG, BMP)');
      }
    }
  }, []);

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type.startsWith('image/')) {
        setSelectedFile(file);
        setError('');
      } else {
        setError('Please select a valid image file (JPG, PNG, BMP)');
      }
    }
  };

  const analyzeImage = async () => {
    if (!selectedFile) {
      setError('Please select an image first');
      return;
    }

    setLoading(true);
    setError('');
    setAnalysisResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await axios.post(`${API_URL}/api/analyze`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setAnalysisResult(response.data.analysis);
    } catch (err) {
      setError(err.response?.data?.detail || 'Analysis failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/history`);
      setHistory(response.data);
    } catch (err) {
      setError('Failed to load analysis history');
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity.toLowerCase()) {
      case 'high': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'medium': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      case 'low': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity.toLowerCase()) {
      case 'high': return <XCircle className="h-4 w-4" />;
      case 'medium': return <AlertTriangle className="h-4 w-4" />;
      case 'low': return <Eye className="h-4 w-4" />;
      default: return <CheckCircle className="h-4 w-4" />;
    }
  };

  React.useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-64 bg-slate-900/50 backdrop-blur border-r border-slate-800">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <Zap className="h-6 w-6 text-emerald-400" />
            </div>
            <h1 className="text-xl font-bold text-white">Defect Detective</h1>
          </div>
          
          <nav className="space-y-2">
            <p className="text-xs uppercase text-slate-500 font-semibold tracking-wide mb-4">Main Navigation</p>
            
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${
                activeTab === 'dashboard' 
                  ? 'bg-emerald-500/10 text-emerald-400 border-l-2 border-emerald-500' 
                  : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'
              }`}
            >
              <Settings className="h-5 w-5" />
              Dashboard
            </button>
            
            <button
              onClick={() => setActiveTab('analysis')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${
                activeTab === 'analysis' 
                  ? 'bg-emerald-500/10 text-emerald-400 border-l-2 border-emerald-500' 
                  : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'
              }`}
            >
              <Eye className="h-5 w-5" />
              New Analysis
              <div className="ml-auto w-2 h-2 bg-emerald-400 rounded-full" />
            </button>
            
            <button
              onClick={() => setActiveTab('history')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${
                activeTab === 'history' 
                  ? 'bg-emerald-500/10 text-emerald-400 border-l-2 border-emerald-500' 
                  : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'
              }`}
            >
              <History className="h-5 w-5" />
              History
            </button>
            
            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${
                activeTab === 'settings' 
                  ? 'bg-emerald-500/10 text-emerald-400 border-l-2 border-emerald-500' 
                  : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'
              }`}
            >
              <Settings className="h-5 w-5" />
              Settings
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-64 p-8">
        {activeTab === 'analysis' && (
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-white mb-2">New Analysis</h2>
              <p className="text-slate-400">Upload a product image to detect defects using our AI-powered analysis</p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              {/* Upload Section */}
              <Card className="bg-slate-900/50 backdrop-blur border-slate-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Upload className="h-5 w-5 text-emerald-400" />
                    Upload New Image
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer ${
                      dragActive 
                        ? 'border-emerald-400 bg-emerald-500/5' 
                        : 'border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileInput}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    
                    <div className="space-y-4">
                      <div className="mx-auto w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center">
                        <Upload className="h-8 w-8 text-slate-400" />
                      </div>
                      
                      <div>
                        <p className="text-lg text-slate-300 mb-2">
                          {selectedFile ? selectedFile.name : 'Drop your image here'}
                        </p>
                        <p className="text-sm text-slate-500">
                          Upload a product image to detect defects using our AI-powered analysis
                        </p>
                      </div>
                      
                      <Button variant="outline" className="bg-slate-800 border-slate-700 hover:bg-slate-700">
                        Browse Files
                      </Button>
                      
                      <p className="text-xs text-slate-600">
                        Supported formats: JPG, PNG, BMP • Max size: 5MB
                      </p>
                    </div>
                  </div>

                  {error && (
                    <Alert className="mt-4 bg-red-500/10 border-red-500/20">
                      <AlertTriangle className="h-4 w-4 text-red-400" />
                      <AlertDescription className="text-red-300">{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="mt-6">
                    <Button 
                      onClick={analyzeImage}
                      disabled={!selectedFile || loading}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {loading ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Analyzing Image...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Zap className="h-4 w-4" />
                          Analyze Image
                        </div>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Analysis Results */}
              <Card className="bg-slate-900/50 backdrop-blur border-slate-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Eye className="h-5 w-5 text-emerald-400" />
                    Analysis Details
                    {analysisResult && (
                      <Badge variant="outline" className="ml-auto bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                        Complete
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analysisResult ? (
                    <div className="space-y-6">
                      {/* Analysis Summary */}
                      <div className="bg-slate-800/50 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-4">
                          <p className="text-sm text-slate-400">Analysis complete</p>
                          <p className="text-sm text-slate-300">
                            Found {analysisResult.total_defects} defects in your image.
                          </p>
                        </div>
                      </div>

                      {/* Display uploaded image */}
                      {analysisResult.image_base64 && (
                        <div className="space-y-3">
                          <h4 className="font-medium text-slate-300">Analyzed Image</h4>
                          <img 
                            src={`data:image/jpeg;base64,${analysisResult.image_base64}`}
                            alt="Analyzed"
                            className="w-full max-h-64 object-contain bg-slate-800 rounded-lg"
                          />
                        </div>
                      )}

                      <Separator className="bg-slate-800" />

                      {/* Defects List */}
                      <div className="space-y-3">
                        <h4 className="font-medium text-slate-300">Detected Defects</h4>
                        
                        {analysisResult.defects_found && analysisResult.defects_found.length > 0 ? (
                          <div className="space-y-3">
                            {analysisResult.defects_found.map((defect, index) => (
                              <div key={index} className="bg-slate-800/50 rounded-lg p-4">
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    {getSeverityIcon(defect.severity)}
                                    <h5 className="font-medium text-white">{defect.defect_type}</h5>
                                  </div>
                                  <div className="flex gap-2">
                                    <Badge className={getSeverityColor(defect.severity)}>
                                      {defect.severity}
                                    </Badge>
                                    <Badge variant="outline" className="bg-slate-700/50 text-slate-300 border-slate-600">
                                      {Math.round(defect.confidence)}%
                                    </Badge>
                                  </div>
                                </div>
                                <p className="text-sm text-slate-400">{defect.description}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <CheckCircle className="h-12 w-12 text-emerald-400 mx-auto mb-3" />
                            <p className="text-lg font-medium text-emerald-400 mb-1">No Defects Found</p>
                            <p className="text-sm text-slate-400">The image appears to be defect-free</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="mx-auto w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                        <Eye className="h-8 w-8 text-slate-500" />
                      </div>
                      <p className="text-slate-400">Upload and analyze an image to see results here</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-white mb-2">Analysis History</h2>
              <p className="text-slate-400">View your previous defect detection analyses</p>
            </div>

            <div className="space-y-4">
              {history.length > 0 ? (
                history.map((analysis) => (
                  <Card key={analysis.id} className="bg-slate-900/50 backdrop-blur border-slate-800">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center">
                            <Eye className="h-6 w-6 text-slate-400" />
                          </div>
                          <div>
                            <h3 className="font-medium text-white">{analysis.filename}</h3>
                            <p className="text-sm text-slate-400">
                              {new Date(analysis.upload_time).toLocaleDateString()} at {new Date(analysis.upload_time).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="bg-slate-800 text-slate-300 border-slate-700">
                            {analysis.total_defects} defects
                          </Badge>
                          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                            Complete
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card className="bg-slate-900/50 backdrop-blur border-slate-800">
                  <CardContent className="p-12 text-center">
                    <History className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-400 mb-2">No Analysis History</h3>
                    <p className="text-slate-500">Start by analyzing some images to build your history</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {(activeTab === 'dashboard' || activeTab === 'settings') && (
          <div className="max-w-4xl mx-auto">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-white mb-2">
                {activeTab === 'dashboard' ? 'Dashboard' : 'Settings'}
              </h2>
              <p className="text-slate-400">
                {activeTab === 'dashboard' 
                  ? 'Overview of your defect detection analytics' 
                  : 'Configure your analysis preferences'
                }
              </p>
            </div>
            
            <Card className="bg-slate-900/50 backdrop-blur border-slate-800">
              <CardContent className="p-12 text-center">
                <div className="mx-auto w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                  {activeTab === 'dashboard' ? (
                    <Settings className="h-8 w-8 text-slate-500" />
                  ) : (
                    <Settings className="h-8 w-8 text-slate-500" />
                  )}
                </div>
                <h3 className="text-lg font-medium text-slate-400 mb-2">Coming Soon</h3>
                <p className="text-slate-500">
                  {activeTab === 'dashboard' 
                    ? 'Dashboard features are under development' 
                    : 'Settings panel is under development'
                  }
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;