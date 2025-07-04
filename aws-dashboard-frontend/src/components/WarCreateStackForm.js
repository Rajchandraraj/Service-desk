import React, { useState } from "react";
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";

export default function WarCreateStackForm({ onClose }) {
  const [step, setStep] = useState(1);
  const [stackName, setStackName] = useState("");
  const [templateSource, setTemplateSource] = useState("s3");
  const [s3Url, setS3Url] = useState("");
  const [uploadedFile, setUploadedFile] = useState(null);
  const [gitUrl, setGitUrl] = useState("");
  const [tags, setTags] = useState([{ key: "", value: "" }]);
  const [permissions, setPermissions] = useState("CAPABILITY_NAMED_IAM");
  const [region, setRegion] = useState("us-east-1");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [s3Templates, setS3Templates] = useState([]);
  const [loadingS3, setLoadingS3] = useState(false);

  // Region selector always at the top
  const renderRegionSelector = () => (
    <div className="mb-6">
      <label className="block mb-2 font-semibold">
        Region:
        <select
          className="border p-1 rounded ml-2"
          value={region}
          onChange={e => setRegion(e.target.value)}
        >
          <option value="us-east-1">US East (N. Virginia)</option>
          <option value="us-west-2">US West (Oregon)</option>
          <option value="ap-south-1">Asia Pacific (Mumbai)</option>
        </select>
      </label>
    </div>
  );

  // Step 1: Specify stack details
  const renderStep1 = () => (
    <div>
      <h3 className="text-xl font-bold mb-4">Step 1: Create Stack</h3>
      <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded">
        <b className="block mb-2">Prerequisite - Prepare template</b>
        <div className="flex gap-4">
          <button
            className={`px-4 py-2 rounded font-semibold shadow ${showTemplates ? "bg-blue-700" : "bg-blue-500"} text-white transition`}
            onClick={() => {
              setShowTemplates(!showTemplates);
              setShowComposer(false);
            }}
            type="button"
          >
            Choose an existing template
          </button>
          
        </div>
        {/* Expanded content in a new row, full width */}
        {(showTemplates || showComposer) && (
          <div className="flex mt-6">
            {showTemplates && (
              <div className="flex-1 bg-white border rounded p-4 shadow">
                <div className="mb-4">
                  <b>Prepare template</b>
                  <div className="text-gray-700 text-sm mt-1">
                    Every stack is based on a template. A template is a JSON or YAML file that contains configuration information about the AWS resources you want to include in the stack.
                  </div>
                </div>
                <div className="mb-4">
                  <b>Template source</b>
                  <div className="flex gap-4 mt-2">
                    <label>
                      <input
                        type="radio"
                        name="templateSource"
                        value="s3"
                        checked={templateSource === "s3"}
                        onChange={() => setTemplateSource("s3")}
                      /> Amazon S3 URL
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="templateSource"
                        value="upload"
                        checked={templateSource === "upload"}
                        onChange={() => setTemplateSource("upload")}
                      /> Upload a template file
                    </label>
                  
                  </div>
                  <div className="mt-3">
                    {templateSource === "s3" && (
                      <div>
                        <label className="block mb-2">Amazon S3 URL:</label>
                        <input
                          className="border p-1 rounded w-full"
                          value={s3Url}
                          onChange={e => setS3Url(e.target.value)}
                          placeholder="https://s3.amazonaws.com/your-bucket/template.yaml"
                        />
                      </div>
                    )}
                    {templateSource === "upload" && (
                      <div>
                        <label className="block mb-2">Upload a template file:</label>
                        <input
                          type="file"
                          accept=".json,.yaml,.yml"
                          onChange={async e => {
                            const file = e.target.files[0];
                            if (file) {
                              await handleFileUpload(file);
                            }
                          }}
                        />
                        {uploadedFile && <div className="text-sm mt-1">Selected: {uploadedFile.name}</div>}
                      </div>
                    )}
                    {templateSource === "git" && (
                      <div>
                        <label className="block mb-2">Git Repository URL:</label>
                        <input
                          className="border p-1 rounded w-full"
                          value={gitUrl}
                          onChange={e => setGitUrl(e.target.value)}
                          placeholder="https://github.com/your-org/your-repo/path/to/template.yaml"
                        />
                      </div>
                    )}
                  </div>
                </div>
              
              </div>
            )}
            {showComposer && (
              <div className="flex-1 bg-white border rounded p-4 shadow">
                <b>Create a template in Infrastructure Composer</b>
                <div className="text-sm text-gray-700 mt-2 mb-4">
                  Use Infrastructure Composer to visually design your stacks on a simple, drag-and-drop interface. Infrastructure Composer automatically updates and validates the template.
                </div>
                <button
                  className="bg-purple-600 text-white px-4 py-2 rounded font-semibold"
                  type="button"
                  onClick={() => alert("Open Infrastructure Composer!")}
                >
                  Create in Infrastructure Composer
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    
      <button
        className="bg-blue-600 text-white px-6 py-2 rounded font-semibold shadow"
        onClick={() => setStep(2)}
        disabled={!stackName}
      >
        Next
      </button>
    </div>
  );

  // Step 2: Configure stack options
  const renderStep2 = () => (
    <div>
      <h3 className="font-bold mb-2">Step 2: Configure Stack Options</h3>
      <div className="mb-2">
        <label className="block font-semibold">Tags:</label>
        {tags.map((tag, idx) => (
          <div key={idx} className="flex gap-2 mb-1">
            <input
              className="border p-1 rounded"
              placeholder="Key"
              value={tag.key}
              onChange={e => {
                const newTags = [...tags];
                newTags[idx].key = e.target.value;
                setTags(newTags);
              }}
            />
            <input
              className="border p-1 rounded"
              placeholder="Value"
              value={tag.value}
              onChange={e => {
                const newTags = [...tags];
                newTags[idx].value = e.target.value;
                setTags(newTags);
              }}
            />
            <button
              className="bg-red-500 text-white px-2 rounded"
              onClick={() => setTags(tags.filter((_, i) => i !== idx))}
              disabled={tags.length === 1}
            >-</button>
          </div>
        ))}
        <button className="bg-green-500 text-white px-2 rounded" onClick={() => setTags([...tags, { key: "", value: "" }])}>+</button>
      </div>
      <div className="mb-2">
        <label className="block font-semibold">Permissions:</label>
        <select className="border p-1 rounded" value={permissions} onChange={e => setPermissions(e.target.value)}>
          <option value="CAPABILITY_NAMED_IAM">CAPABILITY_NAMED_IAM</option>
          <option value="CAPABILITY_IAM">CAPABILITY_IAM</option>
        </select>
      </div>
      <button className="bg-blue-600 text-white px-4 py-2 rounded mr-2" onClick={() => setStep(1)}>Back</button>
      <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={() => setStep(3)}>Next</button>
    </div>
  );

  // Step 3: Review and create
  const renderStep3 = () => (
    <div>
      <h3 className="font-bold mb-2">Step 3: Review and Create</h3>
      <div className="mb-2"><b>Stack Name:</b> {stackName}</div>
      <div className="mb-2"><b>Template URL:</b> {s3Url || (uploadedFile ? uploadedFile.name : gitUrl)}</div>
      <div className="mb-2"><b>Region:</b> {region}</div>
      <div className="mb-2"><b>Tags:</b> {tags.filter(t => t.key && t.value).map(t => `${t.key}=${t.value}`).join(", ") || "None"}</div>
      <div className="mb-2"><b>Permissions:</b> {permissions}</div>
      <button className="bg-blue-600 text-white px-4 py-2 rounded mr-2" onClick={() => setStep(2)}>Back</button>
      <button className="bg-purple-600 text-white px-4 py-2 rounded" onClick={handleCreateStack} disabled={loading}>
        {loading ? "Creating..." : "Create Stack"}
      </button>
      {result && <div className="text-green-700 mt-4">{result}</div>}
      {error && <div className="text-red-700 mt-4">{error}</div>}
    </div>
  );

  // Backend call to create stack
  async function handleCreateStack() {
    setLoading(true);
    setError('');
    setResult('');
    try {
      const res = await fetch(`${BACKEND_URL}/api/war/create-stack`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stackName,
          templateURL: s3Url || (uploadedFile ? uploadedFile.name : gitUrl),
          region,
          tags: tags.filter(t => t.key && t.value),
          permissions
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(`Stack creation started: ${data.stackId || 'Check CloudFormation console.'}`);
    } catch (err) {
      setError(err.message || "Failed to create stack");
    }
    setLoading(false);
  }

  const handleFileUpload = async (file) => {
    // 1. Get pre-signed URL from backend
    const res = await fetch(`${BACKEND_URL}/api/war/get-upload-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName: file.name })
    });
    const { uploadURL, fileUrl, error } = await res.json();
    if (error) {
      alert("Upload URL error: " + error);
      return;
    }

    // 2. Upload file to S3
    await fetch(uploadURL, {
      method: 'PUT',
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
      body: file
    });

    // 3. Set the S3 URL as the template source
    setS3Url(fileUrl);
    setUploadedFile(file);
  };

  return (
    <div className="p-4 border rounded bg-white mt-4">
      <button className="float-right text-red-600 font-bold" onClick={onClose}>X</button>
      {renderRegionSelector()}
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
    </div>
  );
}