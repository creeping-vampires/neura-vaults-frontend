import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  Target,
  BarChart3,
  Shield,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useUserAccess } from "../hooks/useUserAccess";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const socials = [
  { name: "twitter", link: "https://x.com/Neuravaults" },
  { name: "discord", link: "https://discord.gg/officialneuravaults" },
  { name: "gitbook", link: "https://neura-vaults.gitbook.io/neura-vaults/" },
];

const Sidebar = ({ isOpen = false, onClose }: SidebarProps) => {
  const location = useLocation();
  const [isLoaded, setIsLoaded] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebarCollapsed");
    return saved ? JSON.parse(saved) : false;
  });
  const { isAdmin } = useUserAccess();

  const menuItems = [
    { icon: Home, path: "/", tooltip: "Dashboard" },
    { icon: BarChart3, path: "/vaults", tooltip: "Vaults" },
    { icon: Target, path: "/portfolio", tooltip: "Portfolio" },
    ...(isAdmin ? [{ icon: Shield, path: "/admin", tooltip: "Admin" }] : []),
  ];

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem("sidebarCollapsed", JSON.stringify(newState));
  };

  return (
    <div
      className={`sidebar-container
        fixed left-0 flex flex-col h-full
        transition-all duration-300 border-r border-border
        shadow-xl lg:shadow-none
        w-52 ${
          isCollapsed ? "lg:w-[80px] lg:min-w-[80px]" : "lg:w-52 lg:min-w-52"
        }
        ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 lg:relative backdrop-blur-[10px] bg-background/70 z-[101]
      `}
      aria-hidden={!isOpen}
    >
      <button
        onClick={toggleSidebar}
        className="hidden lg:flex absolute top-14 -right-3.5 z-50 h-7 w-7 items-center justify-center rounded-full border border-border bg-background shadow-md hover:bg-accent transition-colors"
      >
        {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      <div className="p-4 py-2 border-b border-border">
        <div
          className={`flex items-center transition-all duration-1000 ${
            isCollapsed ? "lg:justify-center" : ""
          }`}
        >
          <div className="relative group">
            <img
              src="/logo.webp"
              className="min-w-[65px] h-[65px] -my-[6.5px] rounded-xl transition-all duration-300"
            />
          </div>
          <div
            className={`overflow-hidden transition-all duration-300 ${
              isCollapsed ? "lg:w-0 lg:opacity-0 lg:ml-0" : "w-auto opacity-100"
            }`}
          >
            <h1 className="text-sidebar-foreground font-medium text-xl font-libertinus transition-all duration-300 group-hover:text-white">
              Neura
            </h1>
            <p className="text-base text-muted-foreground font-libertinus -mt-1">
              Vaults
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 mt-2">
        <div className="space-y-3">
          {menuItems.map((item, index) => {
            const isActive =
              location.pathname === item.path ||
              (item.path !== "/" && location.pathname.startsWith(item.path));
            const isHovered = hoveredItem === item.path;

            return (
              <Tooltip key={item.path} delayDuration={0}>
                <TooltipTrigger asChild>
                  <div
                    className={`transition-all duration-700`}
                    style={{
                      transitionDelay: isLoaded
                        ? `${index * 150 + 300}ms`
                        : "0ms",
                    }}
                  >
                    <Link
                      to={item.path}
                      onMouseEnter={() => setHoveredItem(item.path)}
                      onMouseLeave={() => setHoveredItem(null)}
                      onClick={() => onClose?.()}
                      className={`
                        relative flex items-center ${
                          isCollapsed ? "lg:justify-center lg:px-2" : "px-4"
                        } py-2.5 rounded-lg transition-colors group overflow-hidden border
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
                        font-medium font-libertinus transition-all duration-300 relative z-10 whitespace-nowrap overflow-hidden
                        ${isActive ? "text-white font-bold tracking-wide" : ""}
                        ${
                          isCollapsed
                            ? "lg:w-0 lg:opacity-0 lg:ml-0"
                            : "w-auto opacity-100 ml-4"
                        }
                      `}
                      >
                        {item.tooltip}
                      </span>

                      {/* Exact navbar button hover animation */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
                    </Link>
                  </div>
                </TooltipTrigger>
                {isCollapsed && (
                  <div className="hidden lg:block">
                    <TooltipContent side="right">
                      <p>{item.tooltip}</p>
                    </TooltipContent>
                  </div>
                )}
              </Tooltip>
            );
          })}
        </div>
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-border">
        <div
          className={`flex items-center ${
            isCollapsed
              ? "lg:flex-col lg:gap-4"
              : "justify-center gap-6 ml-auto"
          }`}
        >
          {socials.map(({ name, link }, idx) => (
            <a
              href={link}
              key={idx}
              target="_blank"
              rel="noopener noreferrer"
              className="h-9 w-9 rotate-45 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center"
            >
              <div className="-rotate-45 inline-flex h-7 w-7 items-center justify-center">
                {/* <Icon className="h-5 w-5 text-muted-foreground" /> */}
                <img
                  src={`/${name}.svg`}
                  alt={name}
                  className="h-4 w-4 invert opacity-70"
                />
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;