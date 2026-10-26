export function miroNode({s,st,part,rep,active,euro,offer,firstMeeting},node='root'){
 if(node==='root') return {say:firstMeeting?'Ah, jij bent nieuw hier toch? Ik ben Miro. Deze Späti is zo’n beetje mijn tweede woonkamer.':part==='ochtend'?'Morgen. Koffie is op, bestellingen zijn er wel.':part==='nacht'?'Nog onderweg? Berlijn houdt nooit echt op.':'Yo. Alles goed?',choices:[
  {t:'Heb je werk voor me?',n:'work',summary:'koerierwerk'},
  {t:'Hoe gaat het met de Späti?',n:'shop',summary:'de Späti'},
  {t:'Wie ben jij eigenlijk?',n:'about',summary:'Miro'},
  {t:'Ik ga weer.',end:true,summary:'even bijgepraat'}]};
 if(node==='work') return {say:active?`Je hebt al iets lopen naar ${active.to}. Eerst die netjes afleveren.`:`Ja. ${offer(s)}`,choices:[...(!active?[{t:'Ik neem de bezorgklus aan.',effect:'acceptSpati',n:'accepted'}]:[]),{t:'Waar moet ik op letten?',n:'tips',summary:'koerierwerk'},{t:'Top, ik kijk bij de jobkaart.',end:true,summary:'een nieuwe bezorgklus'}]};
 if(node==='accepted')return {say:`Mooi, de bestelling zit in je tas. Bestemming: ${active?.to||'zie je telefoon'}. Route en deadline staan in je telefoon. Lever buiten af.`,choices:[{t:'Ik ga op pad.',end:true,summary:'een bezorgklus aangenomen'}]};
 if(node==='tips') return {say:rep>=3?'Je kent het inmiddels. Check je Linienplan, pak de juiste richting en verspil buiten niet te veel tijd.':'Niet gokken met lijnen. Check je telefoon, daar staat richting én aantal haltes. En hou wat marge voor wachten.',choices:[{t:'Begrepen.',end:true,summary:'bezorgtips'}]};
 if(node==='shop') return {say:rep>=2?'Best goed. Koeriers zoals jij helpen ook: mensen bestellen, jij rijdt, ik verkoop. Iedereen blij.':'Altijd hetzelfde: Mate, peuken, pakketjes, mensen die om 02:00 ineens chips nodig hebben.',choices:[{t:'Typisch Berlijn.',end:true,summary:'de Späti'}]};
 if(node==='about') return {say:'Ik ken hier half Mitte. Niet omdat ik interessant ben, maar omdat iedereen vroeg of laat hier binnenloopt.',choices:[{t:'Handig om jou te kennen dus.',effect:'bond',n:'bond',summary:'Miro beter leren kennen'},{t:'Fair.',end:true,summary:'Miro leren kennen'}]};
 if(node==='bond') return {say:'Precies. En als jij betrouwbaar blijft rijden, hoor je vanzelf meer.',choices:[{t:'Deal.',end:true,summary:'vertrouwen met Miro'}]};
 return {say:'Alles rustig.',choices:[{t:'Later.',end:true,summary:'even gepraat'}]};
}
