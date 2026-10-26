// U8 uses the actual U2 TrainTimeline class. Only world-axis projection differs.
export class U8Service {
  constructor({Timeline,config,stops,direction,startIndex,delay=0,id}){
    this.config=config;this.id=id;this.spacing=config.train.stationSpacing;
    const stations=stops.map((stop,index)=>({...stop,index,z:index*this.spacing}));
    this.timeline=new Timeline({id,line:'U8',stations,direction,startStationIndex:startIndex,initialDelaySeconds:delay});
    this.door=0;this.lastRecenter=-Infinity;
  }
  update(delta,{rider=false}={}){
    this.timeline.update(delta,{allowRecycle:!rider});
    const target=this.timeline.doorsOpen?1:0;
    const step=delta/(target>this.door?.72:.86);
    this.door=target>this.door?Math.min(target,this.door+step):Math.max(target,this.door-step);
  }
  get currentIndex(){return this.timeline.currentStationIndex;}
  get direction(){return this.timeline.direction;}
  get canUseDoors(){return this.timeline.doorsOpen && this.timeline.state==='boarding' && this.door>.82;}
  etaToStation(index){return this.timeline.etaToStation(index);}
  maintain(index,now,{rider=false,waiting=false}={}){
    if(rider || !waiting || !Number.isInteger(index) || index+this.direction<0 || index+this.direction>=this.timeline.route.length)return false;
    // Same local-service rules as Game.keepTestServiceNearby and Phase11 U2.
    if(this.timeline.stopsUntilStation(index)>this.config.train.maxLocalStopsAway){
      this.timeline.recenterNear(index,this.config.train.localLoopDelaySeconds);this.door=0;
    }
    const cap=this.direction<0?12.5:16,delay=this.direction<0?.8:1.6;
    if(this.etaToStation(index)>cap && now-this.lastRecenter>14){
      this.timeline.recenterNear(index,delay);this.door=0;this.lastRecenter=now;return true;
    }
    return false;
  }
  projectedX(stopX,alexIndex){return stopX(alexIndex)+(this.timeline.z-alexIndex*this.spacing)*(stopX(alexIndex+1)-stopX(alexIndex))/this.spacing;}
  mirror(data){
    const t=this.timeline;
    const phases={'waiting-to-approach':'approach',approaching:'approach','opening-first':'open','opening-arrival':'open',boarding:'dwell','depart-delay':'close',cruising:'travel',recycling:'recycle'};
    Object.assign(data,{service:this,currentIndex:t.currentStationIndex,direction:t.direction,fullPhase:phases[t.state],fullT:t.stateTime,door:this.door,
      stopIndex:['boarding','opening-first','opening-arrival','depart-delay'].includes(t.state)?t.currentStationIndex:null,
      nextIndex:t.destinationIndex,from:t.originName,dest:t.destinationName,progress:t.routeProgress,state:phases[t.state]==='travel'?'network':phases[t.state],testHold:false});
  }
}
