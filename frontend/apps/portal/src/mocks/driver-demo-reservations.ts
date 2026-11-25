import { getReservationClosingTime, getTransportDate } from '../utils/reservation-availability'
import { getMockReservationForm } from './reservation-form'

const colleges = [
  { name: 'Faculdade Horizonte', students: [
    'Ana Ribeiro', 'Bruno Tavares', 'Camila Nunes', 'Diego Andrade', 'Elisa Monteiro',
    'Felipe Neves', 'Gabriela Rocha', 'Heitor Martins', 'Isabela Barros', 'João Lima',
  ] },
  { name: 'Faculdade do Litoral', students: [
    'Karina Azevedo', 'Lucas Duarte', 'Marina Alves', 'Nicolas Dantas',
    'Olívia Gomes', 'Paulo Freitas', 'Rafaela Melo', 'Sérgio Campos',
  ] },
  { name: 'Faculdade Costa Verde', students: [
    'Tatiana Mota', 'Ulisses Santos', 'Valéria Moura', 'Wagner Castro', 'Yasmin Lopes', 'Zeca Torres',
  ] },
  { name: 'Faculdade Novo Rumo', students: ['Álvaro Borges', 'Bárbara Reis', 'Clara Pires', 'Daniel Cunha'] },
  { name: 'Faculdade Vale Azul', students: ['Érica Rosa', 'Fábio Sales'] },
]

export function getDriverDemoReservations(reference: Date) {
  const travelDate = getTransportDate(reference)
  const confirmedAt = new Date(Math.min(reference.getTime(), getReservationClosingTime(travelDate).getTime() - 1))
    .toISOString()
  const { boardingPoints } = getMockReservationForm()
  let sequence = 0

  return colleges.flatMap(college => college.students.map(studentName => {
    const index = sequence++
    const point = boardingPoints[index % boardingPoints.length]!
    return {
      id: `driver-demo-reservation-${travelDate}-${index + 1}`,
      studentId: `driver-demo-student-${index + 1}`,
      studentName,
      studentPhone: index % 2 === 0 ? `(00) 90000-${String(index + 1).padStart(4, '0')}` : undefined,
      travelDate,
      college: college.name,
      boardingPoint: point.name,
      boardingPointId: point.id,
      confirmedAt,
      status: 'confirmed' as const,
    }
  }))
}
