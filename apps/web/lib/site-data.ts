export const navItems = [
  { label: 'About', href: '#about' },
  { label: 'Experience', href: '#experience' },
  { label: 'Work', href: '#work' },
  { label: 'Skills', href: '#skills' }
];

export const skillGroups = [
  {
    title: 'Programming & analytics',
    skills: [
      'Python',
      'SQL',
      'NumPy',
      'Pandas',
      'Matplotlib',
      'Seaborn',
      'Microsoft Excel',
      'Power BI',
      'Jupyter Notebook',
      'Google Colab',
      'Statistics',
      'Probability',
      'Linear Algebra',
      'Calculus',
      'Hypothesis Testing',
      'A/B Testing',
      'Exploratory Data Analysis (EDA)',
      'Data Cleaning',
      'Data Preprocessing',
      'Data Visualization',
      'Business Analytics',
      'Data Storytelling'
    ]
  },
  {
    title: 'Machine learning',
    skills: [
      'Feature Engineering',
      'Machine Learning',
      'Scikit-learn',
      'Supervised Learning',
      'Unsupervised Learning',
      'Regression',
      'Classification',
      'Clustering',
      'Random Forest',
      'Decision Trees',
      'XGBoost',
      'LightGBM',
      'Time Series Forecasting',
      'Model Evaluation',
      'Hyperparameter Tuning',
      'SHAP'
    ]
  },
  {
    title: 'AI & deep learning',
    skills: [
      'Deep Learning',
      'Neural Networks',
      'TensorFlow',
      'Keras',
      'PyTorch',
      'Natural Language Processing (NLP)',
      'Computer Vision',
      'Transformers',
      'Hugging Face',
      'Generative AI',
      'Large Language Models (LLMs)',
      'Prompt Engineering',
      'Retrieval-Augmented Generation (RAG)',
      'Vector Databases',
      'Embeddings',
      'LangChain'
    ]
  },
  {
    title: 'Data platforms & engineering',
    skills: [
      'PostgreSQL',
      'MySQL',
      'MongoDB',
      'Apache Spark',
      'PySpark',
      'Apache Airflow',
      'ETL',
      'Data Warehousing',
      'BigQuery',
      'Snowflake',
      'Database Design',
      'Database Migrations'
    ]
  },
  {
    title: 'Web development & design',
    skills: [
      'HTML5',
      'CSS3',
      'JavaScript',
      'TypeScript',
      'React.js',
      'Next.js',
      'Node.js',
      'Express.js',
      'NestJS',
      'Tailwind CSS',
      'Bootstrap',
      'shadcn/ui',
      'Material UI',
      'Responsive Web Design',
      'UI/UX Design',
      'Figma',
      'CSS'
    ]
  },
  {
    title: 'APIs & security',
    skills: [
      'FastAPI',
      'API Integration',
      'Authentication',
      'Authorization',
      'OAuth',
      'Webhooks',
      'Supabase',
      'Row Level Security',
      'OpenAPI'
    ]
  },
  {
    title: 'Cloud & deployment',
    skills: [
      'Streamlit',
      'Docker',
      'MLflow',
      'MLOps',
      'Git',
      'GitHub',
      'GitHub Actions',
      'CI/CD',
      'AWS',
      'Azure',
      'Google Cloud',
      'Model Deployment',
      'Model Monitoring',
      'Vercel',
      'Render',
      'Codex'
    ]
  }
];

export const skills = skillGroups.flatMap((group) => group.skills);

