import { NavLink } from "react-router-dom";

export default function Navbar() {
  return (
    <div className="bg-white shadow-sm">
      <nav className="flex justify-between items-center p-4 max-w-7xl mx-auto">
        <div className="flex items-center space-x-4">
          <NavLink 
            to="/" 
            className="text-lg font-semibold text-gray-900 hover:text-indigo-600"
          >
            Product Manager
          </NavLink>
        </div>
        <div className="flex space-x-4">
          <NavLink 
            className={({ isActive }) => 
              `inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-slate-100 h-9 rounded-md px-3 ${
                isActive ? 'bg-indigo-100 text-indigo-700' : ''
              }`
            }
            to="/"
          >
            Product List
          </NavLink>
          <NavLink 
            className={({ isActive }) => 
              `inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-slate-100 h-9 rounded-md px-3 ${
                isActive ? 'bg-indigo-100 text-indigo-700' : ''
              }`
            }
            to="/create"
          >
            Add Product
          </NavLink>
        </div>
      </nav>
    </div>
  );
}