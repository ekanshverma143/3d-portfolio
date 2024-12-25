import { VerticalTimeline, VerticalTimelineElement }  from 'react-vertical-timeline-component';
import 'react-vertical-timeline-component/style.min.css';

import React from 'react'
import { skills,experiences, socialLinks} from '../constants'
import CTA from '../components/CTA';
import { Link } from 'react-router-dom';

const About = () => {
  return (
    <section className="max-container ">
      <h1 className="head-text">
      नमस्ते, I am <span className="blue-gradient_text font-semibold drop-shadow">Ekansh</span> </h1>
      <div>
        <p className="mt-5 flex flex-col gap-3 text-slate-500 "> I am currently in my final year as an undergraduate at the National Institute of Technology, Hamirpur,
         where I am immersed in the field of electrical engineering. Alongside my studies, I am passionate
          about crafting compelling web experiences as a skilled web developer and designer.</p>
      </div>
      <div className="py-10 flex flex-col ">
        <h3 className="subhead-text ">My Skills </h3>

        <div className="mt-16 flex flex-wrap gap-12" >
          {skills.map((skill)=>(
           <div className="block-container w-20 h-20">
            <div className='btn-back rounded-x1'/>
            <div className="btn-front rounded-x1 flex justify-center items-center ">
              <img src={skill.imageUrl}
                    alt={skill.name} 
                    className="w-1/2 h-1/2 object-contain"/>
            </div>
           </div>
          ))}

        </div>
      </div>
        <div className="py-16">
            <h3 className="subhead-text"> Work Experince</h3>
            <div>
              <p className="mt-5 flex flex-col gap-3 text-slate-500 "> This section encompasses my professional journey over the past few years, incorporating valuable experiences gained during my college years.</p>
            </div>
            <div className="mt-12 flex ">
              <VerticalTimeline>
                {experiences.map((experience)=>(
                  <VerticalTimelineElement
                  key={experience.company_name}
                  date={experience.date}
                  icon={<div className="flex justify-center items-center w-full h-full">

                    <img 
                    src={experience.icon}
                     alt={experience.company_name}
                     className="w-[60%] h=[60%] object-contain" />
                  </div>}
                  
                  
                  iconStyle={{background: experience.iconBg}}
                  contentStyle={{
                    borderBottom:'8px',
                    borderStyle:'solid',
                    borderBottomColor: experience.iconBg,
                    boxShadow:'none',
                  }}



                  >
                    <div>
                      <h3 className="text-black text-xl font-poppins font-semibold">
                        {experience.title}
                      </h3>
                      <p className="text-black-500 font-medium font-base"
                      style={{margin:0}}>
                        {experience.company_name}
                      </p>
                    </div>
                    <ul className="my-5 list-disc ml-5 space-y-2">
                      {experience.points.map((point,index)=>(
                               <li key={`experince-point-${index}`} className="text-black-500/50 pl-1 font-normal text-sm">
                                {point}
                               </li>
                      ))}

                    </ul>
                  </VerticalTimelineElement>
                ))}
              </VerticalTimeline>
            </div>
        </div>
         <hr className="border-slate-200"/>
         <div className="flex justify-center items-center w-full h-full">
           <h3 className='subhead-text'>My <span className="blue-gradient_text font-semibold drop-shadow">Social</span> Links</h3>
          {socialLinks.map((socialLink)=>(
                      <Link to={socialLink.link}>
                         <button>
                             <img src={socialLink.iconUrl}
                                  alt={socialLink.name} 
                                  link={socialLink.link}
                                  className="w-10 h-10 m-5 object-contain"/>
                         </button>
                        </Link>  
            ))}

        </div>
        <hr className="border-slate-200"/>
        <CTA/>

    </section>
  )
}

export default About