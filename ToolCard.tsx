import React from 'react';
import { 
  Layers, 
  Scissors, 
  Minimize2, 
  Image as ImageIcon, 
  FileImage, 
  RotateCw, 
  Lock, 
  ArrowRight,
  Sparkles,
  Scaling,
  Crop,
  ArrowLeftRight,
  Stamp,
  SlidersHorizontal,
  LayoutGrid,
  FileText,
  FileType,
  Calendar,
  UserCheck,
  Vote,
  IdCard,
  Eraser,
  FileBadge
} from 'lucide-react';
import { ToolDefinition, ToolId } from '../types';
import { useAuth } from '../context/AuthContext';

interface ToolCardProps {
  tool: ToolDefinition;
  onSelect: (id: ToolId) => void;
}

const ICON_MAP: Record<string, React.ElementType> = {
  Layers,
  Scissors,
  Minimize2,
  Image: ImageIcon,
  FileImage,
  RotateCw,
  Lock,
  Scaling,
  Crop,
  ArrowLeftRight,
  Stamp,
  SlidersHorizontal,
  LayoutGrid,
  FileText,
  FileType,
  Calendar,
  UserCheck,
  Vote,
  IdCard,
  Eraser,
  Sparkles,
  FileBadge,
};

export const ToolCard: React.FC<ToolCardProps> = ({ tool, onSelect }) => {
  const { isAuthenticated } = useAuth();
  const IconComponent = ICON_MAP[tool.iconName] || (tool.toolType === 'govt' ? FileBadge : (tool.toolType === 'image' ? ImageIcon : FileText));
  const isLocked = tool.isLockedForGuest && !isAuthenticated;

  return (
    <div
      id={`tool-card-${tool.id}`}
      onClick={() => onSelect(tool.id)}
      className={`group relative bg-white rounded-3xl p-6 border shadow-xs hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden text-left ${
        isLocked 
          ? 'border-gray-200/90 hover:border-blue-400/80' 
          : 'border-gray-200/90 hover:border-blue-400/80'
      }`}
    >
      {/* Top row: Icon, Badge and arrow */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div
            className="w-13 h-13 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105 shadow-xs"
            style={{ backgroundColor: tool.bgLight, color: tool.color }}
          >
            <IconComponent className="w-6 h-6" />
          </div>

          <div className="flex items-center gap-1.5">
            {tool.isLockedForGuest ? (
              isLocked ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5 text-amber-600" />
                  <span>Free Sign-in</span>
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                  <span>Unlocked</span>
                </span>
              )
            ) : (
              tool.badge && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  {tool.badge}
                </span>
              )
            )}
            <div className="w-8 h-8 rounded-full bg-gray-50 group-hover:bg-blue-50 text-gray-400 group-hover:text-blue-600 flex items-center justify-center transition-colors">
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </div>

        {/* Name and description */}
        <h3 className="text-lg font-bold text-gray-900 font-google tracking-tight mb-2 group-hover:text-blue-600 transition-colors">
          {tool.name}
        </h3>
        <p className="text-xs sm:text-sm text-gray-600 leading-relaxed line-clamp-2">
          {tool.description}
        </p>
      </div>

      {/* Footer tags */}
      <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
        <div className="flex items-center gap-1.5">
          <span className="uppercase text-[10px] font-bold tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
            {tool.toolType}
          </span>
          <span className="capitalize font-medium text-[11px] text-gray-500 bg-gray-100/80 px-2.5 py-0.5 rounded-full">
            {tool.category}
          </span>
        </div>
        <span className="font-semibold text-blue-600 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
          Open &rarr;
        </span>
      </div>
    </div>
  );
};

