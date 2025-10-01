import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Target, BarChart3, Shield } from "lucide-react";
import { useUserAccess } from "../hooks/useUserAccess";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  isMobile?: boolean;
}

const Sidebar = ({
  isOpen = false,
  onClose,
  isMobile = false,
}: SidebarProps) => {
  const location = useLocation();
  const [isLoaded, setIsLoaded] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const { isAdmin } = useUserAccess();

  const menuItems = [
    { icon: Home, path: "/", tooltip: "Dashboard" },
    { icon: BarChart3, path: "/markets", tooltip: "Vaults" },
    { icon: Target, path: "/portfolio", tooltip: "Portfolio" },
    ...(isAdmin ? [{ icon: Shield, path: "/admin", tooltip: "Admin" }] : []),
    // { icon: HelpCircle, path: '/help', tooltip: 'How it works' }
  ];

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  return (
    <div
      className={`sidebar-container w-64 backdrop-blur-[10px] bg-background/80 border-r border-border transition-all duration-300 flex flex-col h-full z-50 ${
        isMobile
          ? `absolute left-0 top-[-10px] h-full transform ${
              isOpen ? "translate-x-0" : "-translate-x-full"
            } shadow-xl`
          : "relative"
      }`}
      aria-hidden={isMobile && !isOpen}
    >
      <div className="p-4 py-2 border-b border-border">
        <div className={`flex items-center transition-all duration-1000`}>
          <div className="relative group">
            <img
              src="/logo.webp"
              className="w-[52px] h-[52px] rounded-xl transition-all duration-300"
            />
          </div>
          <div className="ml-1 overflow-hidden">
            <h1 className="text-sidebar-foreground font-medium text-xl font-libertinus transition-all duration-300 group-hover:text-white">
              Neura
            </h1>
            <p className="text-sm text-muted-foreground font-libertinus -mt-1">
              Vaults
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 mt-2">
        <div className="space-y-3">
          {menuItems.map((item, index) => {
            const isActive = location.pathname === item.path;
            const isHovered = hoveredItem === item.path;

            return (
              <div
                key={item.path}
                className={`transition-all duration-700`}
                style={{
                  transitionDelay: isLoaded ? `${index * 150 + 300}ms` : "0ms",
                }}
              >
                <Link
                  to={item.path}
                  onMouseEnter={() => setHoveredItem(item.path)}
                  onMouseLeave={() => setHoveredItem(null)}
                  onClick={() => isMobile && onClose?.()}
                  className={`
                    relative flex items-center px-4 py-2.5 rounded-lg transition-colors group overflow-hidden border
                    ${
                      isActive
                        ? "bg-[#262626] text-foreground shadow-lg transform scale-[1.03] border-border"
                        : "text-sidebar-foreground bg-background border-border hover:bg-border"
                    }
                  `}
                >
                  {/* Animated wave indicator */}
                  <div
                    className={`
                    absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-white via-gray-300 to-gray-500 transition-all duration-500
                    ${
                      isActive
                        ? "opacity-100 scale-y-100"
                        : "opacity-0 scale-y-0"
                    }
                  `}
                  />

                  {/* Icon with subtle animation */}
                  <div className="relative z-10">
                    <item.icon
                      className={`
                      h-5 w-5 transition-all duration-5000 text-sidebar-foreground
                    `}
                    />
                  </div>

                  {/* Text with subtle hover effect */}
                  <span
                    className={`
                    ml-4 font-medium font-libertinus transition-all duration-5000 relative z-10
                    ${isActive ? "text-white font-bold tracking-wide" : ""}
                  `}
                  >
                    {item.tooltip}
                  </span>

                  {/* Exact navbar button hover animation */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
                </Link>
              </div>
            );
          })}
        </div>
      </nav>

      {/* User Profile */}
      {/* <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
            <User className="h-4 w-4 text-muted-foreground" />
          </div>
            <div className="ml-3 flex-1">
              <p className="text-sidebar-foreground font-medium text-sm">User</p>
              <p className="text-sidebar-accent text-xs">Connected</p>
            </div>
        </div>
      </div> */}
    </div>
  );
};

export default Sidebar;