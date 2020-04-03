import { Op } from 'sequelize';
import * as Yup from 'yup';

import {
  isAfter,
  isBefore,
  parseISO,
  setSeconds,
  setMinutes,
  setHours,
  startOfDay,
  endOfDay,
} from 'date-fns';

import Deliveryman from '../models/Deliveryman';
import Delivery from '../models/Delivery';
import Recipient from '../models/Recipient';
import File from '../models/File';

class DashboardController {
  async index(req, res) {
    const { id: deliverymanId } = req.params;

    const deliveryman = await Deliveryman.findByPk(deliverymanId);

    if (!deliveryman) {
      return res.status(400).json({ error: 'Delivery man does not exists' });
    }

    const deliveries = await Delivery.findAll({
      where: {
        deliveryman_id: deliverymanId,
        canceled_at: null,
        end_date: null,
      },
      attributes: [
        'id',
        'deliveryman_id',
        'product',
        'start_date',
        'end_date',
        'canceled_at',
      ],
      order: ['id'],
      include: [
        {
          model: Recipient,
          as: 'recipient',
          attributes: [
            'id',
            'name',
            'state',
            'city',
            'street',
            'number',
            'complement',
            'zip_code',
          ],
        },
        {
          model: File,
          as: 'signature',
          attributes: ['id', 'url', 'path'],
        },
      ],
    });

    return res.json(deliveries);
  }

  async show(req, res) {
    const { id } = req.params;

    const deliveryman = await Deliveryman.findByPk(id);

    if (!deliveryman) {
      return res.status(400).json({ error: 'Deliveryman not found.' });
    }

    const order = await Delivery.findAll({
      where: {
        deliveryman_id: id,
        end_date: {
          [Op.not]: null,
        },
      },
      attributes: [
        'id',
        'deliveryman_id',
        'product',
        'start_date',
        'end_date',
        'canceled_at',
      ],
      include: [
        {
          model: Recipient,
          as: 'recipient',
          attributes: [
            'id',
            'name',
            'state',
            'city',
            'street',
            'number',
            'complement',
            'zip_code',
          ],
        },
        {
          model: File,
          as: 'signature',
          attributes: ['url', 'path'],
        },
      ],
    });

    if (!order) {
      return res.status(400).json({ error: 'This order connot be found.' });
    }

    return res.json(order);
  }

  async update(req, res) {
    const schema = Yup.object().shape({
      start_date: Yup.date(),
      end_date: Yup.date(),
      signatureId: Yup.number(),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation fails' });
    }

    // INICIO - Verifica se existe um entregador e uma encomenda
    const { deliveryman_id, delivery_id } = req.params;

    const deliverymanExists = await Deliveryman.findOne({
      where: { id: deliveryman_id },
    });

    const delivery = await Delivery.findOne({
      where: { id: delivery_id },
    });

    if (!deliverymanExists && !delivery) {
      return res
        .status(400)
        .json({ error: 'Delivery and Deliveryman does not exists' });
    }

    if (!deliverymanExists) {
      return res.status(400).json({ error: 'Deliveryman does not exists' });
    }

    if (!delivery) {
      return res.status(400).json({ error: 'Delivery does not exists' });
    }
    // FIM - Verifica se existe um entregador e uma encomenda

    const { start_date, end_date, signature_id } = req.body;

    if (start_date) {
      const initialDate = parseISO(start_date);

      if (start_date && isBefore(initialDate, new Date()))
        res.status(400).json({ error: 'Past dates are not allowed !' });

      const initialHour = setSeconds(
        setMinutes(setHours(initialDate, 8), 0),
        0
      );
      const finalHour = setSeconds(setMinutes(setHours(initialDate, 18), 0), 0);

      if (
        isAfter(initialDate, finalHour) ||
        isBefore(initialDate, initialHour)
      ) {
        res
          .status(400)
          .json({ error: 'Delivery of orders only between 08:00 and 18:00' });
      }

      const { count: numbersOfDeliveries } = await Delivery.findAndCountAll({
        where: {
          deliveryman_id,
          start_date: {
            [Op.between]: [startOfDay(initialDate), endOfDay(initialDate)],
          },
        },
      });

      if (numbersOfDeliveries >= 5)
        res.status(400).json({
          error: 'It is not possible to withdraw, daily limit reached.',
        });

      await delivery.update({ start_date });

      return res.json({ message: 'Order withdrawn' });
    }
    if (end_date || signature_id) {
      await delivery.update({ end_date, signature_id });
      return res.json({ message: 'Delivery completed.' });
    }
    return res.json();
  }
}

export default new DashboardController();
