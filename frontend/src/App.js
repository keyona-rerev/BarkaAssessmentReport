import React, { useState } from 'react';
// Make sure you have installed lucide-react: npm install lucide-react
import { FileText, Calculator, TrendingUp, Users, Leaf, ChevronRight, CheckCircle, Copy, Search, Download, AlertTriangle, Loader2 } from 'lucide-react';

const BarkaAssessmentApp = () => {
  const [step, setStep] = useState('select'); // 'select', 'bulk', 'manual', 'results'
  const [bulkData, setBulkData] = useState('');
  const [scores, setScores] = useState({}); // Stores manual/AI-suggested scores for each subcategory
  const [evidence, setEvidence] = useState({}); // Stores manual/AI-suggested evidence for each subcategory
  const [strengths, setStrengths] = useState({}); // Stores AI-generated strengths for each subcategory
  const [gaps, setGaps] = useState({}); // Stores AI-generated gaps for each subcategory

  const [currentPillar, setCurrentPillar] = useState(0);
  const [companyName, setCompanyName] = useState('');
  const [analysisResults, setAnalysisResults] = useState(null); // Stores Claude's raw output (including strengths/gaps)
  const [finalReport, setFinalReport] = useState(null); // Stores final calculated report data

  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false); // For loading state during Claude API call
  const [analysisError, setAnalysisError] = useState(null); // For displaying API call errors

  const pillars = [
    {
      name: "Financial",
      weight: 0.30,
      icon: <Calculator className="w-6 h-6" />,
      color: "bg-blue-500",
      subcategories: [
        { name: "Financial Statements", weight: 0.25, keywords: ["audited", "financial statements", "bookkeeping"] }, // Adjusted from 0.25
        { name: "Budgeting Process", weight: 0.10, keywords: ["budget", "forecasting", "planning"] }, // Adjusted from 0.10
        { name: "Financial Reporting", weight: 0.20, keywords: ["reports", "transparency", "investor"] }, // Adjusted from 0.20
        { name: "Financial Performance", weight: 0.30, keywords: ["profitability", "cash flow", "revenue"] }, // Adjusted from 0.40 to 0.30 (Total 1.00)
        { name: "Fundraising", weight: 0.15, keywords: ["fundraising", "investors", "capital"] } // Adjusted from 0.15
      ]
    },
    {
      name: "Business Strategy",
      weight: 0.30,
      icon: <TrendingUp className="w-6 h-6" />,
      color: "bg-green-500",
      subcategories: [
        { name: "Risk Management", weight: 0.35, keywords: ["risk", "mitigation", "assessment"] }, // Adjusted from 0.50 to 0.35
        { name: "Business Model", weight: 0.25, keywords: ["business model", "value proposition", "strategy"] }, // Adjusted from 0.40 to 0.25
        { name: "Market Analysis", weight: 0.20, keywords: ["market", "competition", "analysis"] }, // Adjusted from 0.30 to 0.20
        { name: "Growth Strategy", weight: 0.20, keywords: ["growth", "vision", "expansion"] } // Adjusted from 0.30 to 0.20 (Total 1.00)
      ]
    },
    {
      name: "Legal & Operations",
      weight: 0.10,
      icon: <FileText className="w-6 h-6" />,
      color: "bg-purple-500",
      subcategories: [
        { name: "Ethics & Compliance", weight: 0.50, keywords: ["ethics", "compliance", "governance"] },
        { name: "Board Structure", weight: 0.10, keywords: ["board", "directors", "oversight"] },
        { name: "Operations", weight: 0.40, keywords: ["procedures", "processes", "SOPs"] }
      ]
    },
    {
      name: "People & Communication",
      weight: 0.10,
      icon: <Users className="w-6 h-6" />,
      color: "bg-orange-500",
      subcategories: [
        { name: "Leadership", weight: 0.60, keywords: ["CEO", "leadership", "management"] },
        { name: "Team Management", weight: 0.30, keywords: ["team", "managers", "staff"] },
        { name: "Staff Development", weight: 0.10, keywords: ["training", "development", "HR"] }
      ]
    },
    {
      name: "Impact",
      weight: 0.20,
      icon: <Leaf className="w-6 h-6" />,
      color: "bg-emerald-500",
      subcategories: [
        { name: "Impact Strategy", weight: 0.50, keywords: ["impact", "theory of change", "social"] },
        { name: "Climate Impact", weight: 0.20, keywords: ["climate", "environmental", "carbon"] },
        { name: "Social Impact", weight: 0.15, keywords: ["gender", "inclusion", "community"] },
        { name: "Impact Measurement", weight: 0.15, keywords: ["data", "metrics", "monitoring"] }
      ]
    }
  ];

  const scoreLabels = {
    1: "Absent/Too Early",
    2: "Basic/Too Early",
    3: "Developing/Near Ready",
    4: "Well-Developed/Investment Ready",
    5: "Optimized/Best Practice"
  };

  const processBulkData = async () => {
    if (!bulkData.trim()) {
      setAnalysisError("Please paste some data to analyze.");
      return;
    }

    setIsLoadingAnalysis(true); // Start loading
    setAnalysisError(null); // Clear previous errors

    try {
      // Attempt to extract company name client-side initially for immediate display
      const initialNameMatch = bulkData.match(/company[:\s]*([A-Za-z\s&]+)/i) ||
                               bulkData.match(/^([A-Z][A-Za-z\s&]+(?:Inc|Ltd|LLC|Corp))/m) ||
                               bulkData.match(/([A-Z][A-Za-z\s&]{3,})/);
      const tempCompanyName = initialNameMatch ? initialNameMatch[1].trim() : 'Company Assessment';
      setCompanyName(tempCompanyName); // Update company name as soon as possible

      // THIS IS THE API CALL TO YOUR VERCE/SERVERLESS FUNCTION
      const response = await fetch('/api/analyze-with-claude', { // <-- Crucial: Changed to relative path!
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bulkData, companyName: tempCompanyName, pillars }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const claudeOutput = await response.json();
      console.log("Claude's processed output:", claudeOutput);

      const autoScores = {};
      const autoEvidence = {};
      const autoStrengths = {}; // NEW
      const autoGaps = {}; // NEW

      if (claudeOutput.companyName) {
          setCompanyName(claudeOutput.companyName); // Update with Claude's extracted name if more accurate
      }

      if (claudeOutput.subcategoryScoresAndEvidence) {
          for (const key in claudeOutput.subcategoryScoresAndEvidence) {
              const item = claudeOutput.subcategoryScoresAndEvidence[key];
              autoScores[key] = item.score;
              autoEvidence[key] = item.evidence;
              autoStrengths[key] = item.strengths || []; // Store strengths, default to empty array
              autoGaps[key] = item.gaps || []; // Store gaps, default to empty array
          }
      }

      setScores(autoScores);
      setEvidence(autoEvidence);
      setStrengths(autoStrengths); // NEW
      setGaps(autoGaps); // NEW
      setAnalysisResults(claudeOutput); // Store Claude's full output for display in manual step
      setStep('manual'); // Move to manual review step
    } catch (error) {
      console.error('Error during Claude analysis:', error);
      setAnalysisError(`Analysis failed: ${error.message}. Please try again or check the console for details.`);
    } finally {
      setIsLoadingAnalysis(false); // Stop loading regardless of success or failure
    }
  };

  const calculateScore = () => {
    let totalScore = 0;
    
    pillars.forEach((pillar, pillarIndex) => {
      let pillarScore = 0;
      let totalWeight = 0;
      
      pillar.subcategories.forEach((subcategory, subIndex) => {
        const key = `${pillarIndex}-${subIndex}`;
        const score = scores[key] || 0; // Use 0 if score is not set
        pillarScore += score * subcategory.weight;
        totalWeight += subcategory.weight;
      });
      
      // Avoid division by zero if a pillar has no subcategories or totalWeight is 0
      if (totalWeight > 0) {
        totalScore += (pillarScore / totalWeight) * pillar.weight;
      }
    });
    
    return totalScore;
  };

  const exportToPDF = () => {
    const reportContent = generateReportHTML();
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Investment Readiness Report - ${companyName}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
            .score-box { background: #f0f9ff; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
            .pillar { margin: 20px 0; padding: 15px; border-left: 4px solid #3b82f6; background: #f8fafc; }
            .section { margin: 20px 0; }
            .section h3 { color: #1e40af; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; }
            .section h6 { color: #2563eb; margin-top: 10px; margin-bottom: 5px; font-size: 0.9em; } /* For Strengths/Gaps headings */
            .subcategory-detail { margin-top: 10px; padding-left: 15px; border-left: 2px solid #e5e7eb; }
            .detail-list { list-style-type: disc; margin-left: 20px; }
            .detail-list li { margin-bottom: 5px; }
            @media print { body { margin: 20px; } }
          </style>
        </head>
        <body>
          ${reportContent}
        </body>
      </html>
    `);
    printWindow.document.close();
    
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  const exportToDoc = () => {
    const reportContent = generateReportHTML();
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Investment Readiness Report - ${companyName}</title>
        </head>
        <body>
          ${reportContent}
        </body>
      </html>
    `;
    
    const blob = new Blob([htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Investment_Readiness_Report_${companyName?.replace(/\s+/g, '_') || 'Company'}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const generateReportHTML = () => {
    if (!finalReport) return '';
    
    // The overall evidence list from the manual input is still here, but we'll prioritize detailed evidence
    // from Claude in the subcategory breakdown.
    const overallEvidenceList = Object.entries(evidence)
      .filter(([key, value]) => value && value.trim())
      .map(([key, value]) => {
        const [pillarIdx, subIdx] = key.split('-').map(Number);
        const pillar = pillars[pillarIdx];
        const subcategory = pillar.subcategories[subIdx]; // FIX: Corrected from pillar.subIdx to pillar.subcategories[subIdx]
        return `<li><strong>${pillar.name} - ${subcategory.name}:</strong> ${value}</li>`;
      }).join('');

    // Collect all specific gaps for a consolidated Recommendations section
    const allGaps = [];
    pillars.forEach((pillar, pillarIndex) => {
      pillar.subcategories.forEach((subcategory, subIndex) => {
        const key = `${pillarIndex}-${subIndex}`;
        const subGaps = gaps[key] || [];
        if (subGaps.length > 0) {
          allGaps.push(`<strong>${pillar.name} - ${subcategory.name}:</strong>`);
          allGaps.push(...subGaps); // Add individual gap items
        }
      });
    });

    return `
      <div class="header">
        <h1>Investment Readiness Assessment Report</h1>
        <h2>${companyName || 'Company Assessment'}</h2>
        <p>Generated on ${new Date().toLocaleDateString()}</p>
      </div>

      <div class="score-box">
        <h2>Overall Investment Readiness Score</h2>
        <div style="font-size: 48px; font-weight: bold; color: #3b82f6; margin: 10px 0;">
          ${finalReport.score.toFixed(2)}/5.0
        </div>
        <div style="font-size: 24px; font-weight: bold; margin: 10px 0;">
          ${finalReport.level}
        </div>
      </div>

      <div class="section">
        <h3>Pillar Breakdown & Detailed Assessment</h3>
        ${pillars.map((pillar, pillarIndex) => `
          <div class="pillar">
            <h4>${pillar.name} (Weight: ${(pillar.weight * 100)}%)</h4>
            <p>Pillar Score: <strong>${finalReport.pillarScores[pillarIndex].toFixed(2)}/5.0</strong></p>
            
            ${pillar.subcategories.map((subcategory, subIndex) => {
              const key = `${pillarIndex}-${subIndex}`;
              const subScore = scores[key] || 0;
              const subEvidence = evidence[key] || 'No specific evidence provided.';
              const subStrengths = strengths[key] || [];
              const subGaps = gaps[key] || [];

              return `
                <div class="subcategory-detail">
                  <h5>${subcategory.name} (Weight: ${(subcategory.weight * 100)}% of ${pillar.name})</h5>
                  <p>Score: <strong>${subScore.toFixed(1)}/5.0</strong></p>
                  <p><strong>Evidence:</strong> ${subEvidence}</p>

                  ${subStrengths.length > 0 ? `
                    <h6>Strengths:</h6>
                    <ul class="detail-list">
                      ${subStrengths.map(s => `<li>${s}</li>`).join('')}
                    </ul>
                  ` : ''}

                  ${subGaps.length > 0 ? `
                    <h6>Gaps/Areas for Improvement:</h6>
                    <ul class="detail-list">
                      ${subGaps.map(g => `<li>${g}</li>`).join('')}
                    </ul>
                  ` : ''}
                </div>
              `;
            }).join('')}
          </div>
        `).join('')}
      </div>

      <div class="section">
        <h3>Executive Summary</h3>
        <p>${companyName || 'The company'} achieved an overall investment readiness score of ${finalReport.score.toFixed(2)}/5.0,
        placing it in the "${finalReport.level}" category.</p>
        
        ${finalReport.level === 'Investment Ready' ?
          '<p>The company demonstrates strong performance across all areas and is attractive to investors with potential for favorable investment terms.</p>' :
          finalReport.level === 'Near Ready' ?
            '<p>The company has established a good foundation with targeted improvements needed. Many investors would consider these businesses investment-ready with a development plan.</p>' :
            '<p>The company has fundamental gaps in critical processes that present significant investment risk. Focus on building foundational systems and documentation before seeking significant outside investment.</p>'
        }
      </div>

      <div class="section">
        <h3>Assessment Criteria</h3>
        <ul>
          <li><strong>Investment Ready (4.0-5.0):</strong> Strong performance across all pillars, minimal critical gaps, scalable systems</li>
          <li><strong>Near Ready (3.0-3.99):</strong> Good performance in most areas, some gaps addressable with focused effort</li>
          <li><strong>Too Early (&lt;3.0):</strong> Significant gaps in multiple critical areas, substantial development needed</li>
        </ul>
      </div>

      <div class="section">
        <h3>Assessor Information</h3>
        <p><strong>Assessor:</strong> Barka Assessment Team</p>
        <p><strong>Date of Assessment:</strong> ${new Date().toLocaleDateString()}</p>
      </div>

      <div class="section">
        <h3>Methodology Notes</h3>
        <p>This report is based on the Barka Investment Readiness Framework, which assesses companies across five key pillars: Financial, Business Strategy, Legal & Operations, People & Communication, and Impact. Scores are assigned on a 1-5 scale, with 5 indicating optimal performance. Data is derived from provided company documentation and advanced AI analysis, which identifies specific strengths and areas for improvement.</p>
      </div>

      ${overallEvidenceList ? `
        <div class="section">
          <h3>General Supporting Evidence (from manual input)</h3>
          <ul>
            ${overallEvidenceList}
          </ul>
        </div>
      ` : ''}

      ${allGaps.length > 0 ? `
        <div class="section">
          <h3>Recommendations & Improvement Plan</h3>
          <p>Based on the assessment, the following areas have been identified for improvement:</p>
          <ul class="detail-list">
            ${allGaps.map(gap => `<li>${gap}</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      <div class="section">
        <h3>Next Steps</h3>
        <p>This assessment provides a baseline for investment readiness. Regular reassessment is recommended as the company develops its capabilities and systems. Companies are encouraged to prioritize addressing the identified gaps to enhance their attractiveness to potential investors.</p>
      </div>
    `;
  };

  const generateReport = () => {
    const finalScore = calculateScore();
    let level = "Too Early";
    let color = "text-red-600";
    
    if (finalScore >= 4.0) {
      level = "Investment Ready";
      color = "text-green-600";
    } else if (finalScore >= 3.0) {
      level = "Near Ready";
      color = "text-yellow-600";
    }
    
    const pillarScores = pillars.map((pillar, pillarIndex) => {
      let pillarScore = 0;
      let totalWeight = 0;
      
      pillar.subcategories.forEach((subcategory, subIndex) => {
        const key = `${pillarIndex}-${subIndex}`;
        const score = scores[key] || 0;
        pillarScore += score * subcategory.weight;
        totalWeight += subcategory.weight;
      });
      
      return totalWeight > 0 ? pillarScore / totalWeight : 0; // Avoid division by zero
    });
    
    setFinalReport({
      score: finalScore,
      level,
      color,
      pillarScores
    });
    setStep('results');
  };

  if (step === 'select') {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h1 className="text-3xl font-bold text-center mb-8">Barka Investment Readiness Assessment</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div
                onClick={() => setStep('bulk')}
                className="p-6 border-2 border-gray-300 rounded-lg hover:border-blue-500 cursor-pointer transition-colors"
              >
                <div className="text-center">
                  <Copy className="w-12 h-12 mx-auto mb-4 text-blue-600" />
                  <h3 className="text-xl font-semibold mb-2">Bulk Data Analysis (AI Powered)</h3>
                  <p className="text-gray-600">Paste company documents for automatic analysis</p>
                </div>
              </div>
              
              <div
                onClick={() => setStep('manual')}
                className="p-6 border-2 border-gray-300 rounded-lg hover:border-green-500 cursor-pointer transition-colors"
              >
                <div className="text-center">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-green-600" />
                  <h3 className="text-xl font-semibold mb-2">Manual Assessment</h3>
                  <p className="text-gray-600">Step-by-step guided assessment</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'bulk') {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold">Bulk Data Analysis</h1>
              <button
                onClick={() => setStep('select')}
                className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg"
              >
                ← Back
              </button>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Information & Documents
              </label>
              <textarea
                value={bulkData}
                onChange={(e) => setBulkData(e.target.value)}
                className="w-full h-96 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="Paste all company information here:
• Financial statements and reports
• Business plans and strategy documents  
• Operational procedures and policies
• Impact reports and metrics
• Any other relevant company data

The system will analyze this text and suggest scores based on documented evidence."
              />
              <p className="text-sm text-gray-500 mt-2">
                Characters: {bulkData.length.toLocaleString()}
              </p>
            </div>
            
            {analysisError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                <strong className="font-bold">Error!</strong>
                <span className="block sm:inline"> {analysisError}</span>
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={processBulkData}
                disabled={!bulkData.trim() || isLoadingAnalysis}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
              >
                {isLoadingAnalysis ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    Analyze Data
                    <Search className="w-4 h-4 ml-2" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'manual') {
    const currentPillarData = pillars[currentPillar];
    
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-6xl mx-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold text-gray-900">
                Assessment: {companyName || 'Company'}
              </h1>
              <button
                onClick={generateReport}
                disabled={Object.keys(scores).length === 0}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Generate Report
              </button>
            </div>
            <div className="flex items-center space-x-4 overflow-x-auto">
              {pillars.map((pillar, index) => (
                <div
                  key={index}
                  className={`flex items-center px-3 py-2 rounded-lg cursor-pointer transition-colors whitespace-nowrap ${
                    index === currentPillar
                      ? pillar.color + ' text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                  onClick={() => setCurrentPillar(index)}
                >
                  {pillar.icon}
                  <span className="ml-2 text-sm font-medium">{pillar.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto p-6">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="flex items-center mb-6">
              <div className={`${currentPillarData.color} text-white p-3 rounded-lg mr-4`}>
                {currentPillarData.icon}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{currentPillarData.name}</h2>
                <p className="text-gray-600">Weight: {(currentPillarData.weight * 100)}% of total score</p>
              </div>
            </div>

            {currentPillarData.subcategories.map((subcategory, subIndex) => {
              const key = `${currentPillar}-${subIndex}`;
              const currentScore = scores[key] || 0;
              const currentEvidence = evidence[key] || '';
              const currentStrengths = strengths[key] || []; // NEW
              const currentGaps = gaps[key] || []; // NEW
              
              // analysisResults holds Claude's output
              const claudeSuggestion = analysisResults?.subcategoryScoresAndEvidence?.[key];
              
              return (
                <div key={subIndex} className="mb-6 p-4 border rounded-lg">
                  <div className="mb-3">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-gray-900">{subcategory.name}</h4>
                      <span className="text-sm text-gray-500">Weight: {(subcategory.weight * 100)}%</span>
                    </div>
                    
                    {claudeSuggestion && claudeSuggestion.score && ( // Display Claude's suggestion
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                        <h5 className="font-medium text-blue-800 text-sm mb-1">AI Analysis Suggestion</h5>
                        <p className="text-blue-700 text-sm">Suggested Score: {claudeSuggestion.score}/5</p>
                        {claudeSuggestion.evidence && (
                          <p className="text-blue-600 text-xs mt-1">Evidence: "{claudeSuggestion.evidence}"</p>
                        )}
                        {claudeSuggestion.strengths && claudeSuggestion.strengths.length > 0 && (
                          <p className="text-blue-600 text-xs mt-1">Strengths: {claudeSuggestion.strengths.join('; ')}</p>
                        )}
                        {claudeSuggestion.gaps && claudeSuggestion.gaps.length > 0 && (
                          <p className="text-blue-600 text-xs mt-1">Gaps: {claudeSuggestion.gaps.join('; ')}</p>
                        )}
                        <button
                          onClick={() => {
                            setScores({...scores, [key]: claudeSuggestion.score});
                            setEvidence({...evidence, [key]: claudeSuggestion.evidence});
                            setStrengths({...strengths, [key]: claudeSuggestion.strengths}); // NEW
                            setGaps({...gaps, [key]: claudeSuggestion.gaps}); // NEW
                          }}
                          className="mt-2 px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                        >
                          Apply Suggestion
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 mb-4">
                    {[1, 2, 3, 4, 5].map((score) => (
                      <button
                        key={score}
                        onClick={() => setScores({...scores, [key]: score})}
                        className={`p-3 rounded-lg border text-sm transition-colors ${
                          currentScore === score
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="font-semibold">{score}</div>
                        <div className="text-xs mt-1">{scoreLabels[score]}</div>
                      </button>
                    ))}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Supporting Evidence
                    </label>
                    <textarea
                      value={currentEvidence}
                      onChange={(e) => setEvidence({...evidence, [key]: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      rows="2"
                      placeholder="Provide evidence for your score..."
                    />
                  </div>

                  {/* Manual input for Strengths and Gaps if not applying AI suggestion */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mt-4 mb-2">
                      Strengths (comma-separated)
                    </label>
                    <textarea
                      value={currentStrengths.join(', ')}
                      onChange={(e) => setStrengths({...strengths, [key]: e.target.value.split(',').map(s => s.trim()).filter(s => s)})}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      rows="2"
                      placeholder="e.g., Strong financial controls, Clear market strategy"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mt-4 mb-2">
                      Gaps/Areas for Improvement (comma-separated)
                    </label>
                    <textarea
                      value={currentGaps.join(', ')}
                      onChange={(e) => setGaps({...gaps, [key]: e.target.value.split(',').map(s => s.trim()).filter(s => s)})}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      rows="2"
                      placeholder="e.g., Need better documentation, Improve team training"
                    />
                  </div>
                </div>
              );
            })}

            <div className="flex justify-between items-center pt-6 border-t">
              <button
                onClick={() => setCurrentPillar(Math.max(0, currentPillar - 1))}
                disabled={currentPillar === 0}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
              >
                Previous
              </button>
              
              <div className="text-sm text-gray-600">
                {currentPillar + 1} of {pillars.length} • Score: {calculateScore().toFixed(2)}/5.0
              </div>
              
              {currentPillar === pillars.length - 1 ? (
                <button
                  onClick={generateReport}
                  disabled={Object.keys(scores).length === 0}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Generate Report
                </button>
              ) : (
                <button
                  onClick={() => setCurrentPillar(currentPillar + 1)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Next
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'results' && finalReport) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-4">Investment Readiness Results</h1>
              <h2 className="text-xl text-gray-600">{companyName || 'Company Assessment'}</h2>
            </div>
            
            <div className="text-center mb-8 p-6 bg-gray-50 rounded-lg">
              <div className="text-6xl font-bold text-blue-600 mb-2">{finalReport.score.toFixed(2)}</div>
              <div className={`text-2xl font-semibold ${finalReport.color} mb-2`}>{finalReport.level}</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {pillars.map((pillar, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <div className={`${pillar.color} text-white p-2 rounded-lg mr-3`}>
                      {pillar.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold">{pillar.name}</h3>
                      <div className="text-xs text-gray-600">Weight: {(pillar.weight * 100)}%</div>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gray-800">{finalReport.pillarScores[index].toFixed(2)}</div>
                </div>
              ))}
            </div>

            <div className="bg-blue-50 rounded-lg p-6 mb-6">
              <h3 className="text-xl font-bold mb-3">Investment Readiness Summary</h3>
              <p className="text-gray-800">
                {companyName || 'The company'} achieved an overall investment readiness score of {finalReport.score.toFixed(2)}/5.0,
                placing it in the "{finalReport.level}" category.
                {finalReport.level === 'Investment Ready' && 'The company demonstrates strong performance across all areas and is attractive to investors.'}
                {finalReport.level === 'Near Ready' && 'The company has a good foundation with some targeted improvements needed.'}
                {finalReport.level === 'Too Early' && 'The company has fundamental gaps that require development before seeking investment.'}
              </p>
            </div>

            <div className="flex justify-center space-x-4">
              <button
                onClick={() => {
                  setStep('select'); // Resets to the initial selection screen
                  setScores({}); // Clear scores
                  setEvidence({}); // Clear evidence
                  setStrengths({}); // NEW: Clear strengths
                  setGaps({}); // NEW: Clear gaps
                  setBulkData(''); // Clear bulk data
                  setCompanyName(''); // Clear company name
                  setAnalysisResults(null); // Clear AI analysis results
                  setFinalReport(null); // Clear final report
                }}
                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700" // Red for a "reset" action
              >
                Return to Start
              </button>
              <button
                onClick={() => setStep('manual')}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Back to Assessment
              </button>
              <button
                onClick={exportToPDF}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
              >
                <Download className="w-4 h-4 mr-2" />
                Export PDF
              </button>
              <button
                onClick={exportToDoc}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
              >
                <FileText className="w-4 h-4 mr-2" />
                Export Word Doc
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Invalid Step</h1>
          <p className="text-gray-600 mb-4">Something went wrong. Please refresh the page.</p>
          <button
            onClick={() => setStep('select')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Return to Start
          </button>
        </div>
      </div>
    </div>
  );
};

export default BarkaAssessmentApp;