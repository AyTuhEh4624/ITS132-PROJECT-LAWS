import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

export default function Record() {
  const [form, setForm] = useState({
    price_ori: "",
    delivery: "",
    item_category_detail: "",
    specification: "",
    title: "",
    w_date: "",
    link_ori: "",
    item_rating: "",
    seller_name: "",
    idElastic: "",
    price_actual: "",
    sitename: "",
    idHash: "",
    total_rating: "",
    id: "",
    total_sold: "",
    pict_link: "",
    favorite: "false",
    timestamp: ""
  });

  const [isNew, setIsNew] = useState(true);
  const params = useParams();
  const navigate = useNavigate();
  const [csvFile, setCsvFile] = useState(null);

  useEffect(() => {
    async function fetchData() {
      const id = params.id?.toString();
      if (!id) return;

      try {
        const response = await fetch(`http://localhost:5050/record/${id}`);
        if (!response.ok) throw new Error("Failed to fetch record");

        const data = await response.json();
        if (!data) throw new Error("Record not found");

        setIsNew(false);
        setForm({
          ...data,
          w_date: data.w_date ? new Date(data.w_date).toISOString().split("T")[0] : "",
          timestamp: data.timestamp ? new Date(data.timestamp).toISOString().split("T")[0] : "",
          favorite: data.favorite ? "true" : "false"
        });
      } catch (err) {
        alert(err.message);
        navigate("/");
      }
    }

    fetchData();
  }, [params.id, navigate]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      ...form,
      price_ori: parseFloat(form.price_ori) || 0,
      price_actual: parseFloat(form.price_actual) || 0,
      item_rating: Math.min(5, Math.max(0, parseFloat(form.item_rating) || 0)),
      total_rating: parseInt(form.total_rating) || 0,
      total_sold: parseInt(form.total_sold) || 0,
      w_date: form.w_date ? new Date(form.w_date) : new Date(),
      timestamp: form.timestamp ? new Date(form.timestamp) : new Date(),
      favorite: form.favorite === "true"
    };

    const url = isNew ? "http://localhost:5050/record" : `http://localhost:5050/record/${params.id}`;
    const method = isNew ? "POST" : "PATCH";

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error("Failed to save record");

      navigate("/");
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCSVUpload = async () => {
    if (!csvFile) return;

    const formData = new FormData();
    formData.append("csv", csvFile);

    try {
      const res = await fetch("http://localhost:5050/record/bulk", {
        method: "POST",
        body: formData
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "CSV upload failed");

      alert(`Uploaded ${result.insertedCount} products`);
      navigate("/");
    } catch (err) {
      alert(err.message);
    } finally {
      setCsvFile(null);
      document.querySelector('input[type="file"]').value = '';
    }
  };

  const fieldList = [
    'price_ori', 'delivery', 'item_category_detail', 'seller_name',
    'item_rating', 'total_rating', 'total_sold', 'sitename',
    'idHash', 'idElastic', 'link_ori', 'pict_link'
  ];

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">{isNew ? "Create New" : "Edit"} Product</h1>

      {/* CSV Upload */}
      <div className="mb-8 p-4 border rounded-lg bg-gray-50">
        <h2 className="text-lg font-semibold mb-2">Bulk CSV Import</h2>
        <div className="flex items-center gap-4">
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setCsvFile(e.target.files[0])}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          <button
            type="button"
            onClick={handleCSVUpload}
            disabled={!csvFile}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
          >
            Upload CSV
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          CSV must include: price_ori, delivery, item_category_detail, specification, title, w_date, link_ori, item_rating, seller_name, idElastic, price_actual, sitename, idHash, total_rating, id, total_sold, pict_link, favorite, timestamp
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Title*</label>
            <input
              name="title"
              value={form.title}
              onChange={handleChange}
              required
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Price Actual*</label>
            <input
              type="number"
              name="price_actual"
              value={form.price_actual}
              onChange={handleChange}
              required
              className="w-full border rounded px-3 py-2"
            />
          </div>

          {fieldList.map(field => (
            <div key={field} className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">{field.replace(/_/g, ' ')}</label>
              <input
                name={field}
                type={field.includes("price") || field.includes("rating") || field.includes("sold") ? "number" : "text"}
                value={form[field]}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          ))}

          <div className="space-y-1 col-span-full">
            <label className="block text-sm font-medium text-gray-700">Specification</label>
            <textarea
              name="specification"
              value={form.specification}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
              rows={3}
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Favorite</label>
            <select
              name="favorite"
              value={form.favorite}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
            >
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Date Added</label>
            <input
              type="date"
              name="w_date"
              value={form.w_date}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Last Updated</label>
            <input
              type="date"
              name="timestamp"
              value={form.timestamp}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="px-4 py-2 border rounded-md"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            {isNew ? "Create Product" : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
