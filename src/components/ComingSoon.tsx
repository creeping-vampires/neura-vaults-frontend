import React from 'react';

const ComingSoon: React.FC = () => {
  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-background -mt-10">
       <div className={`flex items-center transition-all duration-1000`}>
          <div className="relative group">
            <img
              src="/logo.png"
              className="w-[72px] h-[72px] rounded-xl transition-all duration-300"
            />
          </div>
        </div>
      <div className="text-center px-6">
        <h1 className="text-3xl font-bold text-white my-3">
          Coming Soon
        </h1>
        <p className="text-muted-foreground">
          Mobile experience is under development
        </p>
      </div>
    </div>
  );
};

export default ComingSoon;