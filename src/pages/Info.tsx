export function Info() {
  return (
    <div className="bg-gray-50 flex items-center justify-center px-4" style={{ height: 'calc(100vh - 64px)' }}>
      <div className="max-w-3xl w-full">
          <div className="bg-white rounded-lg shadow-sm p-8 md:p-12">
            <p className="text-gray-700 text-lg leading-relaxed">
              Este sitio fue creado por Agustín Vallejo, un sketcher de Medellín, Colombia. Es un proyecto personal para compartir dibujos con mis compañeros de ciudad. Espero lo disfruten!
              <br />
              <br />
              Redes:{' '}
              <a 
                href="https://www.instagram.com/agusvallejov/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 font-medium underline decoration-2 underline-offset-2 transition-colors"
              >
                Instagram
              </a>
              {' y '}
              <a 
                href="https://github.com/agustinvallejo" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 font-medium underline decoration-2 underline-offset-2 transition-colors"
              >
                GitHub
              </a>
            </p>
          </div>
      </div>
    </div>
  )
}

