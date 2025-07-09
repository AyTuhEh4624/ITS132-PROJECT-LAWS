import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend, ResponsiveContainer,
  Tooltip,
  XAxis, YAxis
} from 'recharts';

const safeDate = (raw) => {
  const date = new Date(raw);
  return isNaN(date) ? "-" : date.toLocaleDateString();
};

export default function ProductAnalyticsDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recordLoading, setRecordLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const recordsPerPage = 500;
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await fetch('http://localhost:5050/record/analytics');
        const data = await res.json();
        setAnalytics(data);
        setAllCategories(data.categories);
      } catch (err) {
        console.error("Failed to fetch analytics", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  const fetchRecords = async () => {
    setRecordLoading(true);
    try {
      const res = await fetch(`http://localhost:5050/record?page=${currentPage}&limit=${recordsPerPage}`);
      const data = await res.json();
      setRecords(data.records || []);
      setTotalPages(Math.ceil((data.total || 0) / recordsPerPage));
    } catch (err) {
      setError("Failed to fetch records");
    } finally {
      setRecordLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [currentPage]);

  const handleCategorySelection = (selected) => {
    setSelectedCategories(selected);
  };

  const deleteRecord = async (_id) => {
    try {
      await fetch(`http://localhost:5050/record/${_id}`, { method: "DELETE" });
      setRecords((prev) => prev.filter((r) => r._id !== _id));
    } catch {
      setError("Failed to delete record");
    }
  };

  const deleteAllRecords = async () => {
    if (!window.confirm("⚠️ Delete ALL records permanently?")) return;
    const confirmText = prompt('Type "DELETE ALL" to confirm:');
    if (confirmText !== "DELETE ALL") return alert("Confirmation mismatch.");

    try {
      const res = await fetch("http://localhost:5050/record", { method: "DELETE" });
      const data = await res.json();
      alert(data.message || "All records deleted.");
      setRecords([]);
      setCurrentPage(1);
    } catch {
      setError("Failed to delete all records");
    }
  };

  // Filtered data based on selected categories
  const filteredSalesByCategory = analytics?.salesByCategory.filter((item) => selectedCategories.includes(item.name)) || [];
  const filteredProductsByCategory = analytics?.productsByCategory.filter((item) => selectedCategories.includes(item.category)) || [];
  const filteredPriceRangeByCategory = analytics?.priceRangeByCategory.filter((item) => selectedCategories.includes(item.category)) || [];

  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold mb-6">Product Analytics Dashboard</h1>

      {loading ? (
        <div className="text-center text-lg font-semibold mb-10">Loading analysis...</div>
      ) : analytics && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
            {/* Category Filter Dropdown (left side) */}
            <div className="lg:col-span-1 border rounded-lg bg-white p-4 shadow-sm h-full">
              <h3 className="font-semibold text-lg mb-2">Select Categories</h3>
              <select
                multiple
                value={selectedCategories}
                onChange={(e) => handleCategorySelection(Array.from(e.target.selectedOptions, option => option.value))}
                className="w-full p-2 border rounded-lg resize-y overflow-y-auto"
                style={{ maxHeight: '300px' }}  // Controls max height and allows scrolling if needed
              >
                {allCategories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            <div className="lg:col-span-3 space-y-8">
              {/* Total Products, Total Sales, Avg Rating */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="border rounded-lg bg-white p-4 shadow-sm">
                  <h3 className="font-semibold text-lg mb-2">Total Products</h3>
                  <p className="text-4xl font-bold">{analytics.totalProducts ?? 0}</p>
                </div>
                <div className="border rounded-lg bg-white p-4 shadow-sm">
                  <h3 className="font-semibold text-lg mb-2">Total Items Sold</h3>
                  <p className="text-4xl font-bold">{analytics.totalSales ?? 0}</p>
                </div>
                <div className="border rounded-lg bg-white p-4 shadow-sm">
                  <h3 className="font-semibold text-lg mb-2">Avg. Rating</h3>
                  <p className="text-4xl font-bold">{(analytics.avgRating ?? 0).toFixed(1)}</p>
                </div>
              </div>

              {/* Top Categories by Sales */}
              {selectedCategories.length > 0 && (
                <div className="border rounded-lg bg-white p-4 shadow-sm">
                  <h3 className="font-semibold text-lg mb-4">Top Categories by Sales</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={filteredSalesByCategory}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" hide />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#FF6384" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Product Count by Category */}
              {selectedCategories.length > 0 && (
                <div className="border rounded-lg bg-white p-4 shadow-sm">
                  <h3 className="font-semibold text-lg mb-4">Product Count by Category</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={filteredProductsByCategory}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="category" hide />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#36A2EB" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Min vs Max Price by Category */}
              {selectedCategories.length > 0 && (
                <div className="border rounded-lg bg-white p-4 shadow-sm">
                  <h3 className="font-semibold text-lg mb-4">Price Range by Category</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={filteredPriceRangeByCategory}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="category" hide />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="minPrice" fill="#8884d8" name="Min Price" />
                        <Bar dataKey="maxPrice" fill="#FFBB28" name="Max Price" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Seller Performance */}
              <div className="border rounded-lg bg-white p-4 shadow-sm">
                <h3 className="font-semibold text-lg mb-4">Top Sellers</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.sellerPerformance}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="seller" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="products" fill="#8884d8" name="Products Listed" />
                      <Bar dataKey="sales" fill="#82ca9d" name="Items Sold" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Record Table */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold">Clean Product Records</h2>
        <div className="flex gap-2">
          <Link to="/create" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            Add New
          </Link>
          <button onClick={deleteAllRecords} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">
            Delete All
          </button>
        </div>
      </div>

      {error && <div className="text-red-500 mb-4">{error}</div>}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-gray-200">
            <tr className="border-b">
              {["Current ₱", "Original ₱", "Delivery", "Category", "Title", "Spec", "Link", "Rating", "Seller", "Sold", "Site", "Fav", "Listed", "Uploaded", "Actions"].map((h) => (
                <th key={h} className="p-4 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recordLoading ? (
              <tr><td colSpan="15" className="p-4 text-center">Loading records...</td></tr>
            ) : records.length === 0 ? (
              <tr><td colSpan="15" className="p-4 text-center">No records found</td></tr>
            ) : (
              records.map((record) => (
                <tr key={record._id} className="border-b hover:bg-gray-100">
                  <td className="p-4">₱{parseFloat(record.price_actual).toFixed(2)}</td>
                  <td className="p-4">₱{parseFloat(record.price_ori).toFixed(2)}</td>
                  <td className="p-4">{record.delivery}</td>
                  <td className="p-4">{record.item_category_detail?.split("|").join(" > ")}</td>
                  <td className="p-4">{record.title}</td>
                  <td className="p-4">{record.specification}</td>
                  <td className="p-4">
                    <a href={record.link_ori} target="_blank" rel="noreferrer" className="text-blue-600 underline">
                      View
                    </a>
                  </td>
                  <td className="p-4">{record.item_rating}</td>
                  <td className="p-4">{record.seller_name}</td>
                  <td className="p-4">{record.total_sold}</td>
                  <td className="p-4">{record.sitename}</td>
                  <td className="p-4">{record.favorite ? "Yes" : "No"}</td>
                  <td className="p-4">{safeDate(record.w_date)}</td>
                  <td className="p-4">{safeDate(record.timestamp)}</td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <Link to={`/edit/${record._id}`} className="border px-3 py-1 rounded hover:bg-blue-100">Edit</Link>
                      <button
                        onClick={() => deleteRecord(record._id)}
                        className="border px-3 py-1 rounded text-red-600 hover:bg-red-100"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-4">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 border rounded disabled:opacity-50"
          >
            Previous
          </button>
          <span>Page {currentPage} of {totalPages}</span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 border rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
