import React, { useState } from 'react';
import ImageGenerator from './components/ImageGenerator';
import ImageEditor from './components/ImageEditor';
import { GenerateIcon, EditIcon } from './components/icons';

type ActiveTab = 'generate' | 'edit';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('generate');

  const TabButton = ({
    tabName,
    label,
    icon,
  }: {
    tabName: ActiveTab;
    label: string;
    icon: React.ReactNode;
  }) => (
    <button
      onClick={() => setActiveTab(tabName)}
      className={`flex items-center justify-center w-full px-4 py-3 rounded-lg text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-100 focus-visible:ring-blue-500 ${
        activeTab === tabName
          ? 'bg-blue-600 text-white shadow-lg'
          : 'bg-white text-slate-700 hover:bg-slate-50'
      }`}
    >
      {icon}
      <span className="mr-2">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-4xl mx-auto">
        <header className="flex justify-between items-start mb-8">
          <div className="text-right">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-blue-600">
              استودیو تصویر Gemini
            </h1>
            <p className="mt-2 text-lg text-slate-500">
              با قدرت هوش مصنوعی تصاویر را خلق و ویرایش کنید.
            </p>
          </div>
        </header>

        <main>
          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mb-8">
            <TabButton tabName="generate" label="ایجاد تصویر" icon={<GenerateIcon />} />
            <TabButton tabName="edit" label="ویرایش تصویر" icon={<EditIcon />} />
          </div>

          <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-slate-200">
            {activeTab === 'generate' && <ImageGenerator />}
            {activeTab === 'edit' && <ImageEditor />}
          </div>
        </main>
        <footer className="text-center mt-8 text-slate-500 text-sm">
          <p>طراحی شده با Google Gemini و Imagen 4</p>
          <p className="mt-2">
            ساخته شده توسط <a href="https://eitaa.com/yar5313" target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-500 hover:underline">@yar5313</a>
          </p>
        </footer>
      </div>
    </div>
  );
};

export default App;
