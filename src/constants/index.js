import { meta, shopify, starbucks, tesla,ojas,dovetail,iste,gdsc,netflix} from "../assets/images";
import {
    car,
    contact,
    css,
    estate,
    express,
    git,
    github,
    html,
    javascript,
    linkedin,
    mongodb,
    mui,
    nextjs,
    nodejs,
    pricewise,
    react,
    sass,
    snapgram,
    summiz,
    tailwindcss,
    threads,
    typescript
} from "../assets/icons";

export const skills = [
    {
        imageUrl: css,
        name: "CSS",
        type: "Frontend",
    },
    {
        imageUrl: express,
        name: "Express",
        type: "Backend",
    },
    {
        imageUrl: git,
        name: "Git",
        type: "Version Control",
    },
    {
        imageUrl: github,
        name: "GitHub",
        type: "Version Control",
    },
    {
        imageUrl: html,
        name: "HTML",
        type: "Frontend",
    },
    {
        imageUrl: javascript,
        name: "JavaScript",
        type: "Frontend",
    },
    {
        imageUrl: mongodb,
        name: "MongoDB",
        type: "Database",
    },
    {
        imageUrl: mui,
        name: "Material-UI",
        type: "Frontend",
    },
    {
        imageUrl: nextjs,
        name: "Next.js",
        type: "Frontend",
    },
    {
        imageUrl: nodejs,
        name: "Node.js",
        type: "Backend",
    },
    {
        imageUrl: react,
        name: "React",
        type: "Frontend",
    },
    {
        imageUrl: sass,
        name: "Sass",
        type: "Frontend",
    },
    {
        imageUrl: tailwindcss,
        name: "Tailwind CSS",
        type: "Frontend",
    },
    {
        imageUrl: typescript,
        name: "TypeScript",
        type: "Frontend",
    }
];

export const experiences = [
    {
        title: "Web Developer & Graphic Designer",
        company_name: "Dovetail Solutions",
        icon: dovetail,
        iconBg: "#accbe1",
        date: "January 2024 - April 2024",
        points: [
            "Collaborating with the development team to design, develop, and implement new features and improvements to the platform.",
            
            "Designed social media posts for different social media handles as a designer to the firm.",
            "Built new strategies to increase engagement with relevant customers to the company.",
            "Participating in code reviews and providing constructive feedback to other developers.",
        ],
    },
    {
        title: "Media & Marketing Head ",
        company_name: "Indian Society for Technical Education",
        icon: iste,
        iconBg: "#accbe1",
        date: "Jan 2021 - Feb 2022",
        points: [
            "Contributed in website building and creating new features in website for society as part of technicalteam.",
            "Successfully orchestrated high-profile events such as the esteemed International Hult Prize an Prodyogiki with 1000+ participation.",
            "Ensure designs of posters,flyers and other elements during any event of society",
            "Expanded the society's outreach significantly during my tenure as Marketing Head at college.",
        ],
    },
    {
        title: "Core Team (UI/UX)",
        company_name: "Google Developers Student Clubs",
        icon: gdsc,
        iconBg: "#b7e4c7",
        date: "Jan 2022 - Jan 2023",
        points: [
            "Organized  workshops to teach UI/UX Case Study for students in college",
            "Managed team  during events and technical fest organised in college.",
            " Designed UI of multiple  websites as a project from the club to represent in various events.",
            "Participating in Hackathon, MeetUps and events organised by GDSC in different states.",
        ],
    },
    {
        title: "Web Developer",
        company_name: "Team Ojas NITH",
        icon: ojas,
        iconBg: "#FFC78F",
        date: "Jan 2023 - Present",
        points: [
            "Developing and maintaining websites for the club using React.js and other related technologies.",
            "Collaborating with cross-functional teams including designers,club coordinators, and other developers to create high-quality products.",
            "Implementing responsive design and ensuring cross-browser compatibility.",
        ],
    },
];

export const socialLinks = [
    {
        name: 'Contact',
        iconUrl: contact,
        link: '/contact',
    },
    {
        name: 'GitHub',
        iconUrl: github,
        link: 'https://github.com/ekanshverma143',
    },
    {
        name: 'LinkedIn',
        iconUrl: linkedin,
        link: 'https://www.linkedin.com/in/ekanshverma143',
    }
];

export const projects = [
    {
        iconUrl: pricewise,
        theme: 'btn-back-black',
        name: 'Edu-Bot',
        description: ' EduBOT is a Python-based web-app that utilizes Natural Language Processing (NLP) and machine  learning techniques to provide accurate and relevant responses to the school and college level students.',
       
        link: 'https://github.com/swastkk/eduBOT',
    },
    {
        iconUrl: netflix,
        theme: 'btn-back-red',
        name: 'Netflix Clone (Notflix)',
        description: 'Created a front end replica of the popular platform "Netflix," enabling users to post and engage in threaded conversations.',
        link: 'https://notflixx.vercel.app/',
    },
    {
        iconUrl: car,
        theme: 'btn-back-blue',
        name: 'Car Finding App',
        description: 'Designed and built a mobile app for finding and comparing cars on the market, streamlining the car-buying process.',
        link: '/',
    },
   
    {
        iconUrl: estate,
        theme: 'btn-back-black',
        name: 'Real-Estate Application',
        description: 'Developed a web application for real estate listings, facilitating property searches and connecting buyers with sellers.',
        link: '/',
    },
    {
        iconUrl: pricewise,
        theme: 'btn-back-pink',
        name: 'Amazon Price Tracker',
        description: 'Developed a web application that tracks and notifies users of price changes for products on Amazon, helping users find the best deals.',
        link: '/',
    }
];