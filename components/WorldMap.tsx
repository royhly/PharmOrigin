
import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { MedicineOrigin } from '../types';

interface WorldMapProps {
  origin?: MedicineOrigin;
}

const WorldMap: React.FC<WorldMapProps> = ({ origin }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [geoData, setGeoData] = useState<any>(null);

  useEffect(() => {
    // Fetch world map data
    fetch('https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson')
      .then(res => res.json())
      .then(data => setGeoData(data));
  }, []);

  useEffect(() => {
    if (!geoData || !svgRef.current) return;

    const width = 800;
    const height = 500;
    const svg = d3.select(svgRef.current);
    
    // Clear previous elements
    svg.selectAll('*').remove();

    // Create a main container group for all zoomable content
    const g = svg.append('g').attr('class', 'main-container');

    const projection = d3.geoMercator()
      .scale(130)
      .center([0, 20])
      .translate([width / 2, height / 2]);

    const path = d3.geoPath().projection(projection);

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 8])
      .translateExtent([[0, 0], [width, height]])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Draw countries layer
    const countriesGroup = g.append('g').attr('class', 'countries');
    
    countriesGroup.selectAll('path')
      .data(geoData.features)
      .enter()
      .append('path')
      .attr('d', path as any)
      .attr('fill', '#f1f5f9')
      .attr('stroke', '#cbd5e1')
      .attr('stroke-width', 0.5)
      .style('transition', 'fill 0.3s ease')
      .style('cursor', 'pointer')
      .on('mouseenter', function(event, d: any) {
        const centroid = path.centroid(d);
        const cx = isNaN(centroid[0]) ? 0 : centroid[0];
        const cy = isNaN(centroid[1]) ? 0 : centroid[1];

        d3.select(this)
          .transition()
          .duration(250)
          .attr('stroke', '#3b82f6')
          .attr('stroke-width', 1.5)
          .attr('transform', `translate(${cx}, ${cy}) scale(1.03) translate(${-cx}, ${-cy})`)
          .style('filter', 'drop-shadow(0px 4px 6px rgba(0,0,0,0.1))');
        
        d3.select(this).raise(); 
      })
      .on('mouseleave', function(event, d: any) {
        d3.select(this)
          .transition()
          .duration(250)
          .attr('stroke', '#cbd5e1')
          .attr('stroke-width', 0.5)
          .attr('transform', 'translate(0,0) scale(1)')
          .style('filter', 'none');
        
        g.select('.marker-container').raise();
      })
      .transition()
      .duration(800)
      .attr('fill', (d: any) => {
        if (origin && d.id === origin.countryCode) return '#dbeafe'; 
        return '#f8fafc';
      });

    // Draw marker if origin exists
    if (origin) {
      const [x, y] = projection([origin.coordinates.lng, origin.coordinates.lat]) || [0, 0];
      
      const markerGroup = g.append('g')
        .attr('class', 'marker-container')
        .attr('transform', `translate(${x}, ${y}) scale(0)`) 
        .style('filter', 'drop-shadow(0px 4px 6px rgba(0,0,0,0.2))')
        .style('pointer-events', 'none');

      markerGroup.transition()
        .delay(400)
        .duration(800)
        .ease(d3.easeElasticOut.amplitude(1.2).period(0.4))
        .attr('transform', `translate(${x}, ${y}) scale(1)`);

      markerGroup.append('path')
        .attr('d', "M0,0 C-5,-10 -10,-12 -10,-20 A10,10 0 1,1 10,-20 C10,-12 5,-10 0,0 Z")
        .attr('fill', '#ef4444')
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 1.5);

      markerGroup.append('circle')
        .attr('cx', 0)
        .attr('cy', -20)
        .attr('r', 3)
        .attr('fill', 'white');

      const labelGroup = markerGroup.append('g')
        .attr('transform', 'translate(0, -35)');

      const labelText = labelGroup.append('text')
        .attr('text-anchor', 'middle')
        .attr('fill', '#1e293b')
        .attr('font-size', '12px')
        .attr('font-weight', 'bold')
        .attr('class', 'pointer-events-none uppercase')
        .text(origin.country);

      const bbox = (labelText.node() as SVGTextContentElement).getBBox();
      const padding = 4;

      labelGroup.insert('rect', 'text')
        .attr('x', bbox.x - padding)
        .attr('y', bbox.y - padding)
        .attr('width', bbox.width + (padding * 2))
        .attr('height', bbox.height + (padding * 2))
        .attr('rx', 4)
        .attr('fill', 'white')
        .attr('stroke', '#e2e8f0')
        .attr('stroke-width', 1);
        
      const pulseGroup = g.insert('g', '.marker-container')
        .attr('transform', `translate(${x}, ${y})`);

      pulseGroup.append('circle')
        .attr('r', 0)
        .attr('fill', 'none')
        .attr('stroke', '#ef4444')
        .attr('stroke-width', 2)
        .transition()
        .delay(1000)
        .duration(2000)
        .attr('r', 25)
        .style('opacity', 0)
        .on('end', function repeat() {
          d3.select(this)
            .attr('r', 0)
            .style('opacity', 1)
            .transition()
            .duration(2000)
            .attr('r', 25)
            .style('opacity', 0)
            .on('end', repeat);
        });

      // Automatically center and zoom on the marker
      const initialTransform = d3.zoomIdentity
        .translate(width / 2, height / 2)
        .scale(2)
        .translate(-x, -y);

      svg.transition()
        .duration(1500)
        .call(zoom.transform, initialTransform);
    } else {
      // Reset zoom if no origin
      svg.transition()
        .duration(1000)
        .call(zoom.transform, d3.zoomIdentity);
    }

  }, [geoData, origin]);

  return (
    <div className="bg-white rounded-3xl shadow-2xl overflow-hidden p-2 border border-slate-100 ring-1 ring-slate-200/50 group">
      <div className="relative aspect-[16/10] w-full bg-slate-50 cursor-move">
        <svg 
          ref={svgRef} 
          viewBox="0 0 800 500" 
          className="w-full h-full drop-shadow-sm touch-none"
        />
        {/* Soft gradient overlay for depth */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-slate-900/5 to-transparent"></div>
        
        {/* Controls Overlay */}
        <div className="absolute bottom-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-white/90 backdrop-blur shadow-sm border border-slate-200 rounded-lg p-2 text-[10px] text-slate-500 font-medium">
            Scroll to zoom • Drag to pan
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorldMap;
