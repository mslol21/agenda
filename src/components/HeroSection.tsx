import { Calendar, Clock, CheckCircle, ChevronRight } from "lucide-react";
import { Button } from "./ui/button";

export const HeroSection = () => {
  return (
    <section className="relative overflow-hidden pb-16 md:pb-24 pt-8">
      {/* Background Pattern */}
      <div className="absolute inset-0 gradient-hero opacity-5 -z-10" />
      
      <div className="container mx-auto px-4">
        {/* Header / Logo Area */}
        <div className="flex justify-between items-center mb-12 md:mb-20">
             <div className="flex items-center gap-3">
                {/* Logo Placeholder - User can replace this image */}
                <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-primary-foreground shadow-lg transform rotate-3">
                   <span className="font-bold text-2xl">B</span>
                </div>
                <div>
                   <h2 className="font-bold text-xl leading-none">Booking<span className="text-primary">Buddy</span></h2>
                   <p className="text-xs text-muted-foreground uppercase tracking-wider">Seu Espaço de Beleza</p>
                </div>
             </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Text Content */}
            <div className="max-w-2xl text-left animate-fade-in">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent text-accent-foreground text-sm font-medium mb-6">
                <Calendar className="w-4 h-4" />
                Agendamento Online
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
                Agende seu serviço de forma{" "}
                <span className="text-primary">rápida e fácil</span>
              </h1>
              
              <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-lg">
                Escolha o serviço, selecione a data e horário que preferir. 
                Simples assim. Sem ligações, sem espera.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8">
                <Button 
                  size="lg" 
                  className="h-14 px-10 text-lg font-bold gap-2 shadow-xl shadow-primary/25 hover:shadow-primary/40 transition-all rounded-2xl group"
                  onClick={() => document.getElementById('professionals')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Agendar Agora
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>

                <div className="flex flex-col gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-primary/10 rounded-full text-primary"><CheckCircle className="w-3.5 h-3.5" /></div>
                    <span className="font-medium">Confirmação rápida</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-primary/10 rounded-full text-primary"><Clock className="w-3.5 h-3.5" /></div>
                    <span className="font-medium">Disponível 24h</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-primary/10 rounded-full text-primary"><Calendar className="w-3.5 h-3.5" /></div>
                    <span className="font-medium">Escolha sua data</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Establishment Photo */}
            <div className="relative animate-slide-up hidden lg:block group">
                 <div className="absolute inset-0 bg-primary rounded-3xl transform translate-x-4 translate-y-4 opacity-20 group-hover:translate-x-2 group-hover:translate-y-2 transition-transform duration-500" />
                 <div className="relative h-[500px] w-full rounded-3xl overflow-hidden shadow-2xl border-4 border-card">
                     <img 
                        src="https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=800&q=80" 
                        alt="Espaço do Estabelecimento" 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                     />
                     
                     {/* Floating Badge */}
                     <div className="absolute bottom-6 left-6 bg-card/90 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-border/50">
                        <div className="flex items-center gap-3">
                           <div className="flex -space-x-3">
                              <div className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white" />
                              <div className="w-8 h-8 rounded-full bg-slate-300 border-2 border-white" />
                              <div className="w-8 h-8 rounded-full bg-slate-400 border-2 border-white" />
                           </div>
                           <div className="text-xs">
                              <p className="font-bold text-foreground">100+ Clientes</p>
                              <p className="text-muted-foreground">Satisfeitos este mês</p>
                           </div>
                        </div>
                     </div>
                 </div>
            </div>
        </div>
      </div>
    </section>
  );
};
